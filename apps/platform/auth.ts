import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Configures Auth.js to authenticate users and persist their
 * users, accounts, and sessions in the database through Prisma.
 * 
 * Providers: 
 *  - Google
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [Google],
});