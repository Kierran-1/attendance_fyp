import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  deriveStudentId,
  isDatabaseUnavailableError,
  isStudentDbInCooldown,
  markStudentDbUnavailable,
} from '@/lib/student-compat';
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

function buildFallbackProfile(session: Session) {
  const studentId = deriveStudentId({
    id: session.user.id,
    email: session.user.email,
  });

  const idTokenClaims = decodeJwtClaims(session.idToken);

  return {
    studentId,
    phone: idTokenClaims.mobilePhone ?? '',
    program: idTokenClaims.extension_Program ?? idTokenClaims.jobTitle ?? idTokenClaims.department ?? '',
    faculty: idTokenClaims.extension_Faculty ?? idTokenClaims.companyName ?? '',
    intake: idTokenClaims.extension_Intake ?? '',
  };
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

    if (isStudentDbInCooldown()) {
      return NextResponse.json({
        ...buildFallbackProfile(session),
        warning: 'Database unavailable',
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, programName: true },
    });

    const fallbackProfile = buildFallbackProfile(session);
    const studentId = dbUser?.email ? dbUser.email.split('@')[0] : fallbackProfile.studentId;

    const basicMode = req.nextUrl.searchParams.get('basic') === '1';
    if (basicMode) {
      return NextResponse.json({
        studentId,
        phone: fallbackProfile.phone,
        program: dbUser?.programName ?? fallbackProfile.program,
        faculty: fallbackProfile.faculty,
        intake: fallbackProfile.intake,
      });
    }

    // Fetch Microsoft Graph profile for live data
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: 'azure-ad' },
      select: { access_token: true, id_token: true },
      orderBy: { id: 'desc' },
    });

    const accessToken = session.accessToken ?? account?.access_token;
    const idToken = session.idToken ?? account?.id_token;
    const idTokenClaims = decodeJwtClaims(idToken);

    let graphProfile: MicrosoftMe | null = null;
    if (accessToken) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
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
    if (isDatabaseUnavailableError(error)) {
      markStudentDbUnavailable();
      console.warn('[STUDENT_PROFILE_GET] Database unavailable, returning fallback profile');

      const session = await getServerSession(authOptions);
      if (session?.user?.id && session.user.role === UserRole.STUDENT) {
        return NextResponse.json({
          ...buildFallbackProfile(session),
          warning: 'Database unavailable',
        });
      }
    }

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
