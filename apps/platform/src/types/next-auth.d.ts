import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      businessId?: string;
      businessSlug?: string;
      businessName?: string;
      accessLevel?: "owner" | "admin" | "staff";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    businessId?: string;
    businessSlug?: string;
    businessName?: string;
    accessLevel?: "owner" | "admin" | "staff";
  }
}

export {};
