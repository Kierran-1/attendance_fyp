import { type AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Determine role from Swinburne email domain:
 *   @students.swinburne.edu.my -> STUDENT
 *   @swinburne.edu.my          -> LECTURER (staff; promote to ADMIN manually)
 */
function getRoleFromEmail(email: string): UserRole {
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
      // Use the Swinburne tenant if provided, otherwise allow any Microsoft account
      tenantId: process.env.MICROSOFT_TENANT_ID ?? 'common',
      authorization: {
        params: { scope: 'openid profile email' },
      },
    }),
  ],

  callbacks: {
    /**
     * After OAuth sign-in succeeds, set up the user's role and profile
     * if this is their first time signing in.
     */
    async signIn({ user, account }) {
      if (account?.provider !== 'azure-ad' || !user.email) return true;

      // Look up by email, user.id from the OAuth callback may be the provider's
      // external ID, not the database cuid. Email is always the reliable key.
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: {
          // Select only id to avoid selecting stale/removed columns from old generated clients.
          studentProfile: { select: { id: true } },
          lecturerProfile: { select: { id: true } },
        },
      });

      // Guard: adapter hasn't persisted the user yet (shouldn't happen, but be safe)
      if (!dbUser) return true;

      const hasProfile =
        dbUser.studentProfile ||
        dbUser.lecturerProfile;

      if (!hasProfile) {
        const role = getRoleFromEmail(user.email);

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role },
        });

        if (role === UserRole.STUDENT) {
          await prisma.studentProfile.create({
            data: {
              userId: dbUser.id,
              studentId: user.email.split('@')[0],
            },
          });
        } else if (role === UserRole.LECTURER) {
          await prisma.lecturerProfile.create({
            data: { userId: dbUser.id },
          });
        }
      }

      return true;
    },

    /**
     * Attach the user's id and role to the session object so the client
     * can redirect to the correct dashboard and make role-gated requests.
     */
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        // Fetch the latest role from the database (handles manual admin promotions)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? UserRole.STUDENT;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  session: {
    strategy: 'database',
  },
};
