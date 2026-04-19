import { type AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Email overrides — treat these student emails as LECTURER.
 */
const LECTURER_EMAIL_OVERRIDES = new Set([
  '102785480@students.swinburne.edu.my',
  'dev-lecturer.swinburne@outlook.com',
  '102789880@students.swinburne.edu.my',

  // add more here as needed
]);

const STUDENT_EMAIL_OVERRIDES = new Set([
  'dev-student.swinburne@outlook.com'
]);

/**
 * Determine role from Swinburne email domain.
 */
function getRoleFromEmail(email: string): UserRole {
  if (LECTURER_EMAIL_OVERRIDES.has(email)) return UserRole.LECTURER;
  if (STUDENT_EMAIL_OVERRIDES.has(email)) return UserRole.STUDENT;

  if (email.endsWith('@students.swinburne.edu.my')) return UserRole.STUDENT;
  if (email.endsWith('@swinburne@outlook.com')) return UserRole.STUDENT;
  if (email.endsWith('@swinburne.edu.my')) return UserRole.LECTURER;

  return UserRole.STUDENT;
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Can't reach database server") ||
    message.includes('PrismaClientInitializationError') ||
    message.includes('P1001')
  );
}

async function syncUserAndAccount(params: {
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  provider?: string;
  providerAccountId?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  sessionState?: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name ?? null,
      image: params.image ?? null,
      role: params.role,
    },
    create: {
      email: params.email,
      name: params.name ?? null,
      image: params.image ?? null,
      role: params.role,
    },
  });

  if (params.provider && params.providerAccountId) {
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: params.provider,
          providerAccountId: params.providerAccountId,
        },
      },
      update: {
        userId: user.id,
        type: 'oauth',
        access_token: params.accessToken ?? null,
        refresh_token: params.refreshToken ?? null,
        id_token: params.idToken ?? null,
        expires_at: params.expiresAt ?? null,
        scope: params.scope ?? null,
        token_type: params.tokenType ?? null,
        session_state: params.sessionState ?? null,
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: params.provider,
        providerAccountId: params.providerAccountId,
        access_token: params.accessToken ?? null,
        refresh_token: params.refreshToken ?? null,
        id_token: params.idToken ?? null,
        expires_at: params.expiresAt ?? null,
        scope: params.scope ?? null,
        token_type: params.tokenType ?? null,
        session_state: params.sessionState ?? null,
      },
    });
  }

  return user;
}


export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
      allowDangerousEmailAccountLinking: true,

      authorization: {
        params: {
          scope: 'openid profile email User.Read',
          prompt: 'select_account',
        },
      },

      profile(profile) {
        const email = profile.email ?? profile.preferred_username ?? '';

        console.log('[AUTH] Microsoft profile data:', {
          id: profile.sub,
          name: profile.name,
          email,
        });

        return {
          id: profile.sub,
          name: profile.name,
          email,
          image: (profile as any).picture ?? null,
          role: getRoleFromEmail(email),
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      console.log('[AUTH] signIn callback triggered:', {
        provider: account?.provider,
        userEmail: user.email,
      });

      if (!user.email) {
        return true;
      }

      user.role = getRoleFromEmail(user.email);

      try {
        const dbUser = await syncUserAndAccount({
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
          accessToken: account?.access_token,
          refreshToken: account?.refresh_token,
          idToken: account?.id_token,
          expiresAt: account?.expires_at,
          scope: account?.scope,
          tokenType: account?.token_type,
          sessionState: account?.session_state,
        });

        if (dbUser?.id) {
          user.id = dbUser.id;
        }

        console.log('[AUTH] Sign-in successful for:', user.email);
        return true;
      } catch (error) {
        console.error('[AUTH] signIn callback failed:', error);

        if (isDatabaseUnavailableError(error)) {
          console.warn('[AUTH] Continuing with JWT session while database is unavailable');
        }

        return true;
      }
    },

    async jwt({ token, user, account }) {
      const email = user?.email ?? token.email ?? '';

      if (email) {
        token.role = user?.role ?? token.role ?? getRoleFromEmail(email);
      }

      if (user?.id) {
        token.id = user.id;
      } else if (typeof token.id !== 'string' || !token.id) {
        token.id = (typeof token.sub === 'string' && token.sub) || account?.providerAccountId || '';
      }

      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (account?.id_token) {
        token.idToken = account.id_token;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : '';
        session.user.role = token.role ?? getRoleFromEmail(session.user.email ?? '');
        session.accessToken = typeof token.accessToken === 'string' ? token.accessToken : undefined;
        session.idToken = typeof token.idToken === 'string' ? token.idToken : undefined;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;

      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        return `${baseUrl}/auth/redirect`;
      }

      return `${baseUrl}/auth/redirect`;
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  session: {
    strategy: 'jwt',
  },

  debug: true,
};
