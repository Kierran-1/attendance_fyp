import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

type MicrosoftMe = {
  mobilePhone?: string | null;
  department?: string | null;
  companyName?: string | null;
  officeLocation?: string | null;
  jobTitle?: string | null;
};

type JwtClaims = {
  department?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  mobilePhone?: string | null;
  extension_Program?: string | null;
  extension_Faculty?: string | null;
  extension_Intake?: string | null;
};

function decodeJwtClaims(token: string | null | undefined): JwtClaims {
  if (!token) return {};
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload) as JwtClaims;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== UserRole.STUDENT) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, programName: true },
    });

    if (!dbUser?.email) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const studentId = dbUser.email.split('@')[0];

    const basicMode = req.nextUrl.searchParams.get('basic') === '1';
    if (basicMode) {
      return NextResponse.json({
        studentId,
        phone: '',
        program: dbUser.programName ?? '',
        faculty: '',
        intake: '',
      });
    }

    // Fetch Microsoft Graph profile for live data
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'azure-ad' },
      select: { access_token: true, id_token: true },
      orderBy: { id: 'desc' },
    });

    const idTokenClaims = decodeJwtClaims(account?.id_token);

    let graphProfile: MicrosoftMe | null = null;
    if (account?.access_token) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${account.access_token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (graphRes.ok) {
          graphProfile = (await graphRes.json()) as MicrosoftMe;
        } else {
          console.warn('[STUDENT_PROFILE_GET] Graph /me failed:', graphRes.status);
        }
      } catch (graphError) {
        console.warn('[STUDENT_PROFILE_GET] Graph fetch error:', graphError);
      }
    }

    const phone = graphProfile?.mobilePhone ?? idTokenClaims.mobilePhone ?? '';
    const program =
      graphProfile?.jobTitle ??
      graphProfile?.department ??
      idTokenClaims.extension_Program ??
      idTokenClaims.jobTitle ??
      idTokenClaims.department ??
      dbUser.programName ??
      '';
    const faculty =
      graphProfile?.companyName ??
      idTokenClaims.extension_Faculty ??
      idTokenClaims.companyName ??
      '';
    const intake =
      graphProfile?.officeLocation ?? idTokenClaims.extension_Intake ?? '';

    return NextResponse.json({ studentId, phone, program, faculty, intake });
  } catch (error) {
    console.error('[STUDENT_PROFILE_GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Profile is read-only and synced from Microsoft Authenticator' },
    { status: 405 }
  );
}
