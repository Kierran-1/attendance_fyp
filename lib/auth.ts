import { type AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * Student email addresses that should be treated as LECTURER.
 * Useful for dev accounts or lecturers who have student email addresses.
 */
const LECTURER_EMAIL_OVERRIDES = new Set([
  '102785480@students.swinburne.edu.my',
  // add more here as needed
]);

/**
 * Determine role from Swinburne email domain:
 *   @students.swinburne.edu.my -> STUDENT  (unless in LECTURER_EMAIL_OVERRIDES)
 *   @swinburne.edu.my          -> LECTURER
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

      /**
       * This is the key fix for your current error.
       * Your database already contains a user with the same email,
       * so NextAuth must be allowed to link the Azure AD account.
       */
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
          keys: Object.keys(profile),
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
        userId: user.id,
      });

      if (account?.provider !== 'azure-ad' || !user.email) {
        console.log('[AUTH] Skipping callback (not azure-ad or missing email)');
        return true;
      }

      let graphProfile: any = null;

      if (account.access_token) {
        try {
          const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          });

          if (response.ok) {
            graphProfile = await response.json();
            console.log('[AUTH] Fetched Graph profile:', graphProfile);
          } else {
            console.error(
              '[AUTH] Failed to fetch Graph profile:',
              response.status,
              response.statusText
            );
          }
        } catch (error) {
          console.error('[AUTH] Error fetching Graph profile:', error);
        }
      }

      try {
        console.log('[AUTH] Looking up user by email:', user.email);

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: {
            studentProfile: { select: { id: true } },
            lecturerProfile: { select: { id: true } },
          },
        });

        /**
         * If adapter has not created the user yet, let NextAuth continue.
         */
        if (!dbUser) {
          console.log('[AUTH] User not found in database yet, allowing sign-in');
          return true;
        }

        console.log('[AUTH] Found user in database:', {
          userId: dbUser.id,
          hasStudentProfile: !!dbUser.studentProfile,
          hasLecturerProfile: !!dbUser.lecturerProfile,
          currentRole: dbUser.role,
        });

        const role = getRoleFromEmail(user.email);

        /**
         * Always make sure the stored role is correct.
         */
        if (dbUser.role !== role) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { role },
          });

          console.log('[AUTH] Updated user role to:', role);
        }

        /**
         * If profile already exists, just continue.
         */
        if (dbUser.studentProfile || dbUser.lecturerProfile) {
          console.log('[AUTH] User already has profile, allowing sign-in');
          return true;
        }

        /**
         * Otherwise create first-time profile.
         */
        if (role === UserRole.STUDENT) {
          const emailPrefix = user.email.split('@')[0];
          const studentId = emailPrefix;

          console.log('[AUTH] Creating StudentProfile:', {
            userId: dbUser.id,
            studentId,
          });

          await prisma.studentProfile.create({
            data: {
              userId: dbUser.id,
              studentId,
              major: graphProfile?.department ?? null,
            },
          });

          console.log('[AUTH] StudentProfile created successfully');
        } else if (role === UserRole.LECTURER) {
          console.log('[AUTH] Creating LecturerProfile:', {
            userId: dbUser.id,
          });

          await prisma.lecturerProfile.create({
            data: {
              userId: dbUser.id,
              department: graphProfile?.department ?? null,
            },
          });

          console.log('[AUTH] LecturerProfile created successfully');
        }

        console.log('[AUTH] Sign-in callback completed successfully');
        return true;
      } catch (error) {
        console.error('[AUTH] signIn callback failed:', {
          error: error instanceof Error ? error.message : String(error),
          errorCode: (error as any)?.code,
          stack: error instanceof Error ? error.stack : undefined,
        });

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
      /**
       * Keep relative callback URLs working correctly.
       */
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