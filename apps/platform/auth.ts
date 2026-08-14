import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

type BusinessToken = {
  userId?: string;
  businessId?: string;
  businessSlug?: string;
  businessName?: string;
  accessLevel?: "developer" | "owner" | "admin" | "staff";
};

/**
 * Configures Auth.js to authenticate users and persist their
 * users and accounts in the database through Prisma.
 *
 * Business and access-level display information is stored in
 * the JWT session when the user signs in.
 *
 * Providers:
 *  - Google
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  /*
   * Prisma adapters normally default to database sessions.
   * We use JWT sessions so the user's business context can be
   * stored without querying Prisma every time auth() is called.
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
    async jwt({ token, user, trigger }) {
      const businessToken = token as typeof token & BusinessToken;

      const userId = user?.id ?? businessToken.userId ?? token.sub;

      if (!userId) {
        return token;
      }

      businessToken.userId = userId;

      /*
       * Only query Prisma when the JWT does not already contain
       * the user's business information.
       */
      if (
        trigger === "update" ||
        !businessToken.businessId ||
        !businessToken.businessSlug ||
        !businessToken.businessName ||
        !businessToken.accessLevel
      ) {
        const businessUser = await prisma.businessUser.findFirst({
          where: {
            userId,
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
        }
      }

      return businessToken;
    },

    async session({ session, token }) {
      const businessToken = token as typeof token & BusinessToken;

      if (businessToken.userId) {
        session.user.id = businessToken.userId;
      }

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
