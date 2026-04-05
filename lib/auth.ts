import { type AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Email overrides — treat these student emails as LECTURER.
 */
const LECTURER_EMAIL_OVERRIDES = new Set([
  '102785480@students.swinburne.edu.my',
  '102789880@students.swinburne.edu.my',
  // add more here as needed
]);

/**
 * Determine role from Swinburne email domain.
 */
function getRoleFromEmail(email: string): UserRole {
  if (LECTURER_EMAIL_OVERRIDES.has(email)) return UserRole.LECTURER;
  if (email.endsWith('@students.swinburne.edu.my')) return UserRole.STUDENT;
  if (email.endsWith('@swinburne.edu.my')) return UserRole.LECTURER;
  return UserRole.STUDENT;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

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

      if (account?.provider !== 'azure-ad' || !user.email) {
        return true;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          console.log('[AUTH] New user — NextAuth will create the record');
          return true;
        }

        console.log('[AUTH] Sign-in successful for:', user.email);
        return true;
      } catch (error) {
        console.error('[AUTH] signIn callback failed:', error);
        return false;
      }
    },

    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        session.user.role = dbUser?.role ?? UserRole.STUDENT;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/auth/redirect`;
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  session: {
    strategy: 'database',
  },

  debug: true,
};
