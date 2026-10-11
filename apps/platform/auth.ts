import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/s3/get-url";

type BusinessToken = {
  userId?: string;
  onboardingCompleted?: boolean;
  workspaceTourVersion?: number;
  dashboardTourVersion?: number;

  /*
   * These represent the business the user has
   * currently selected inside of the platform.
   */
  businessId?: string;
  businessSlug?: string;
  businessName?: string;

  /*
   * The business image's S3 key. A fresh presigned URL is created from it
   * every time the session is read, because presigned URLs expire after an
   * hour while the session lasts much longer.
   */
  businessImageS3Key?: string | null;

  /*
   * Legacy: older tokens stored the presigned URL itself here, which broke
   * once it expired. Kept only so it can be removed from existing tokens.
   */
  businessImageKey?: string | null;
  accessLevel?: "developer" | "owner" | "admin" | "staff";
};

/**
 * Configures Auth.js to authenticate users and persist their
 * users and accounts in the database through Prisma.
 *
 * JWT sessions are used so the currently-selected business
 * context can be stored without querying Prisma every time
 * auth() is called.
 *
 * Business context is updated explicitly when the user
 * selects or switches businesses.
 *
 * Providers:
 *  - Google
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  /*
   * Prisma adapters normally default to database sessions.
   * We use JWT sessions so the user's selected business
   * context can remain available throughout the dashboard.
   */
  session: {
    strategy: "jwt",
  },

  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const businessToken = token as typeof token & BusinessToken;

      /*
       * On initial sign-in `user` exists.
       * On future JWT callbacks we reuse the stored userId
       * or fall back to token.sub.
       */
      const userId = user?.id ?? businessToken.userId ?? token.sub;

      if (!userId) {
        return token;
      }

      businessToken.userId = userId;

      /*
       * User-level information.
       *
       * This is independent from whichever business the
       * user currently has selected.
       */
      if (
        trigger === "update" ||
        businessToken.onboardingCompleted === undefined ||
        businessToken.workspaceTourVersion === undefined ||
        businessToken.dashboardTourVersion === undefined
      ) {
        const userData = await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            onboardingCompleted: true,
            workspaceTourVersion: true,
            dashboardTourVersion: true,
          },
        });

        if (userData) {
          businessToken.onboardingCompleted = userData.onboardingCompleted;
          businessToken.workspaceTourVersion = userData.workspaceTourVersion;
          businessToken.dashboardTourVersion = userData.dashboardTourVersion;
        }
      }

      /*
       * BUSINESS SELECTION
       */
      const requestedBusinessId =
        trigger === "update" && typeof session?.businessId === "string"
          ? session.businessId
          : undefined;

      if (requestedBusinessId) {
        /*
         * Verify that this user actually belongs to the
         * requested business before storing it in the JWT.
         */
        const businessUser = await prisma.businessUser.findFirst({
          where: {
            userId,
            businessId: requestedBusinessId,
          },

          select: {
            businessId: true,

            business: {
              select: {
                name: true,
                slug: true,
                imageKey: true,
              },
            },

            role: {
              select: {
                accessLevel: true,
              },
            },
          },
        });

        if (businessUser) {
          businessToken.businessId = businessUser.businessId;
          businessToken.businessSlug = businessUser.business.slug;
          businessToken.businessName = businessUser.business.name;

          /*
           * Store the S3 key, not a presigned URL. The session
           * callback signs a fresh URL from it on every read.
           */
          businessToken.businessImageS3Key = businessUser.business.imageKey;
          delete businessToken.businessImageKey;

          businessToken.accessLevel = businessUser.role.accessLevel;
        } else {
          /*
           * The requested business either does not exist
           * for this user or their membership was removed.
           *
           * Remove any old business context rather than
           * leaving stale permissions in the session.
           */
          delete businessToken.businessId;
          delete businessToken.businessSlug;
          delete businessToken.businessName;
          delete businessToken.businessImageS3Key;
          delete businessToken.businessImageKey;
          delete businessToken.accessLevel;
        }
      } else if (
        businessToken.businessId &&
        businessToken.businessImageS3Key === undefined
      ) {
        /*
         * Upgrade tokens created before businessImageS3Key existed.
         * They only hold an expired presigned URL, so look up the
         * S3 key once and drop the stale URL.
         */
        const business = await prisma.business.findUnique({
          where: {
            id: businessToken.businessId,
          },
          select: {
            imageKey: true,
          },
        });

        businessToken.businessImageS3Key = business?.imageKey ?? null;
        delete businessToken.businessImageKey;
      }

      return businessToken;
    },

    async session({ session, token }) {
      const businessToken = token as typeof token & BusinessToken;

      /*
       * Stable user information.
       */
      if (businessToken.userId) {
        session.user.id = businessToken.userId;
      }

      if (businessToken.onboardingCompleted !== undefined) {
        session.user.onboardingCompleted = businessToken.onboardingCompleted;
      }

      if (businessToken.workspaceTourVersion !== undefined) {
        session.user.workspaceTourVersion = businessToken.workspaceTourVersion;
      }

      if (businessToken.dashboardTourVersion !== undefined) {
        session.user.dashboardTourVersion = businessToken.dashboardTourVersion;
      }

      /*
       * Currently-selected business context.
       *
       * These values are populated after the user selects
       * a business and calls useSession().update().
       */
      if (businessToken.businessId) {
        session.user.businessId = businessToken.businessId;
      }

      if (businessToken.businessSlug) {
        session.user.businessSlug = businessToken.businessSlug;
      }

      if (businessToken.businessName) {
        session.user.businessName = businessToken.businessName;
      }

      /*
       * Presigned URLs expire after an hour, so sign a fresh one on
       * every read. Signing happens locally (no request to AWS).
       */
      if (businessToken.businessImageS3Key !== undefined) {
        try {
          session.user.businessImageKey = businessToken.businessImageS3Key
            ? await getObjectUrl(businessToken.businessImageS3Key)
            : null;
        } catch (error) {
          console.error("Failed to sign the business image URL:", error);
          session.user.businessImageKey = null;
        }
      }

      if (businessToken.accessLevel) {
        session.user.accessLevel = businessToken.accessLevel;
      }

      return session;
    },
  },
});
