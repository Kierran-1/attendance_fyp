import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type MicrosoftMe = {
  mobilePhone?: string | null;
  department?: string | null;
  companyName?: string | null;
  officeLocation?: string | null;
  jobTitle?: string | null;
  employeeId?: string | null;
  onPremisesExtensionAttributes?: {
    extensionAttribute1?: string | null;
    extensionAttribute2?: string | null;
    extensionAttribute3?: string | null;
  };
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

/**
 * GET /api/student/profile
 * Fetch the authenticated student's profile data (all synced from Microsoft Authenticator)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { 
        studentId: true, 
        userId: true,
        major: true,
        enrollmentYear: true,
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ message: 'Student profile not found' }, { status: 404 });
    }

    const basicMode = req.nextUrl.searchParams.get('basic') === '1';
    if (basicMode) {
      return NextResponse.json({
        studentId: studentProfile.studentId,
        phone: '',
        program: studentProfile.major ?? '',
        faculty: '',
        intake: studentProfile.enrollmentYear ? String(studentProfile.enrollmentYear) : '',
      });
    }

    // Fetch latest profile attributes directly from Microsoft Graph for live sync.
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'azure-ad',
      },
      select: {
        access_token: true,
        id_token: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const idTokenClaims = decodeJwtClaims(account?.id_token);

    let graphProfile: MicrosoftMe | null = null;
    if (account?.access_token) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
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

    const ext = graphProfile?.onPremisesExtensionAttributes;
    const phone = graphProfile?.mobilePhone ?? idTokenClaims.mobilePhone ?? '';
    const program =
      graphProfile?.jobTitle ??
      graphProfile?.department ??
      idTokenClaims.extension_Program ??
      idTokenClaims.jobTitle ??
      idTokenClaims.department ??
      studentProfile.major ??
      ext?.extensionAttribute1 ??
      '';
    const faculty =
      graphProfile?.companyName ??
      idTokenClaims.extension_Faculty ??
      idTokenClaims.companyName ??
      ext?.extensionAttribute2 ??
      '';
    const intake =
      graphProfile?.officeLocation ??
      idTokenClaims.extension_Intake ??
      (studentProfile.enrollmentYear ? String(studentProfile.enrollmentYear) : '') ??
      ext?.extensionAttribute3 ??
      '';

    return NextResponse.json({
      studentId: studentProfile.studentId,
      phone,
      program,
      faculty,
      intake,
    });
  } catch (error) {
    console.error('[STUDENT_PROFILE_GET]', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/student/profile
 * Update the authenticated student's profile (non-Microsoft fields only)
 * Student ID and Email are locked from Microsoft Authenticator
 */
export async function PUT(req: NextRequest) {
  return NextResponse.json(
    { message: 'Profile is read-only and synced from Microsoft Authenticator' },
    { status: 405 }
  );
}
