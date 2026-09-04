import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

type BusinessToken = {
  userId?: string;
  onboardingCompleted?: boolean;

  /*
   * These represent the business the user has
   * currently selected inside of the platform.
   */
  businessId?: string;
  businessSlug?: string;
  businessName?: string;
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
        businessToken.onboardingCompleted === undefined
      ) {
        const userData = await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            onboardingCompleted: true,
          },
        });

        if (userData) {
          businessToken.onboardingCompleted = userData.onboardingCompleted;
        }
      }

      /*
       * BUSINESS SELECTION
       *
       * A business should NEVER be selected with:
       *
       * findFirst({ where: { userId } })
       *
       * because one user can belong to multiple businesses
       * with different access levels.
       *
       * Instead, the client explicitly passes a businessId
       * through useSession().update() when the user selects
       * or switches businesses.
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
          delete businessToken.accessLevel;
        }
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

      if (businessToken.accessLevel) {
        session.user.accessLevel = businessToken.accessLevel;
      }

      return session;
    },
  },
});
