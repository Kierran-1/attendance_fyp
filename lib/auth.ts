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
        params: { 
          scope: 'openid profile email User.Read',
          prompt: 'select_account',
        },
      },
      // Request additional profile information from Microsoft
      profile(profile, _tokens) {
        const email = profile.email ?? profile.preferred_username ?? '';

        // Log the profile data to see what Microsoft sends
        console.log('[AUTH] Microsoft profile data:', {
          id: profile.sub,
          name: profile.name,
          email,
          // Log all keys to see what's available
          keys: Object.keys(profile),
        });
        
        return {
          id: profile.sub,
          name: profile.name,
          email,
          image: profile.picture,
          role: getRoleFromEmail(email),
        };
      },
    }),
  ],

  callbacks: {
    /**
     * After OAuth sign-in succeeds, set up the user's role and profile
     * if this is their first time signing in.
     */
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
            console.error('[AUTH] Failed to fetch Graph profile:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('[AUTH] Error fetching Graph profile:', error);
        }
      }

      try {
        // Look up by email, user.id from the OAuth callback may be the provider's
        // external ID, not the database cuid. Email is always the reliable key.
        console.log('[AUTH] Looking up user by email:', user.email);
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: {
            // Select only id to avoid selecting stale/removed columns from old generated clients.
            studentProfile: { select: { id: true } },
            lecturerProfile: { select: { id: true } },
          },
        });

        if (!dbUser) {
          console.log('[AUTH] User not found in database (adapter may not have created it yet)');
          return true;
        }

        console.log('[AUTH] Found user in database:', {
          userId: dbUser.id,
          hasStudentProfile: !!dbUser.studentProfile,
          hasLecturerProfile: !!dbUser.lecturerProfile,
        });

        const hasProfile =
          dbUser.studentProfile ||
          dbUser.lecturerProfile;

        if (hasProfile) {
          console.log('[AUTH] User already has profile, allowing sign-in');
          return true;
        }

        console.log('[AUTH] First-time sign-in, creating profile');
        const role = getRoleFromEmail(user.email);
        console.log('[AUTH] Determined role:', role);

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role },
        });

        if (role === UserRole.STUDENT) {
          // Extract studentId from email (e.g., 102789110@students.swinburne.edu.my -> 102789110)
          const studentIdFromEmail = user.email.split('@')[0];
          const studentId = graphProfile?.employeeId || graphProfile?.id || studentIdFromEmail;
          
          console.log('[AUTH] Creating StudentProfile:', {
            userId: dbUser.id,
            studentId,
          });

          if (!studentId) {
            console.error('[AUTH] Failed to extract studentId for:', user.email);
            return false;
          }

          try {
            await prisma.studentProfile.create({
              data: {
                userId: dbUser.id,
                studentId: studentId,
                major: graphProfile?.department,
              },
            });
            console.log('[AUTH] StudentProfile created successfully');
          } catch (profileError) {
            console.error('[AUTH] Failed to create StudentProfile:', {
              userId: dbUser.id,
              studentId,
              error: profileError instanceof Error ? profileError.message : String(profileError),
              errorCode: (profileError as any)?.code,
            });
            throw profileError;
          }
        } else if (role === UserRole.LECTURER) {
          console.log('[AUTH] Creating LecturerProfile:', {
            userId: dbUser.id,
          });

          try {
            await prisma.lecturerProfile.create({
              data: { 
                userId: dbUser.id,
                department: graphProfile?.department,
              },
            });
            console.log('[AUTH] LecturerProfile created successfully');
          } catch (profileError) {
            console.error('[AUTH] Failed to create LecturerProfile:', {
              userId: dbUser.id,
              error: profileError instanceof Error ? profileError.message : String(profileError),
              errorCode: (profileError as any)?.code,
            });
            throw profileError;
          }
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
