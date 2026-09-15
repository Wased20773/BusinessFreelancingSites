import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      onboardingCompleted?: boolean;
      workspaceTourVersion?: number;
      dashboardTourVersion?: number;
      businessId?: string;
      businessSlug?: string;
      businessName?: string;
      businessImageKey?: string | null;
      accessLevel?: "developer" | "owner" | "admin" | "staff";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    onboardingCompleted?: boolean;
    workspaceTourVersion?: number;
    dashboardTourVersion?: number;
    businessId?: string;
    businessSlug?: string;
    businessName?: string;
    businessImageKey?: string | null;
    accessLevel?: "developer" | "owner" | "admin" | "staff";
  }
}

export {};
