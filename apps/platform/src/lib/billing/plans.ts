import type { PlanTier } from "@business-freelancer/database/generated/prisma/enums";

export type PlanKey = "free" | PlanTier;

export type PlanLimits = {
  rateLimit: { burst: number; perMinute: number };
  maxMembers: number;
  maxApiKeys: number;
  maxOriginsPerKey: number;
  sync: boolean;
};

export const PLANS_NAMES: Record<PlanKey, string> = {
  free: "Free",
  familyBusiness: "Family Business",
  localBusiness: "Local Business",
  growingBusiness: "Growing Business",
};

// TODO(pricing): every number here is a placeholder.
export const PLANS: Record<PlanKey, PlanLimits> = {
  free: {
    rateLimit: { burst: 30, perMinute: 15 },
    maxMembers: 3,
    maxApiKeys: 1,
    maxOriginsPerKey: 3,
    sync: false,
  },
  familyBusiness: {
    rateLimit: { burst: 150, perMinute: 60 },
    maxMembers: 5,
    maxApiKeys: 3,
    maxOriginsPerKey: 3,
    sync: true,
  },
  localBusiness: {
    rateLimit: { burst: 400, perMinute: 180 },
    maxMembers: 15,
    maxApiKeys: 10,
    maxOriginsPerKey: 5,
    sync: true,
  },
  growingBusiness: {
    rateLimit: { burst: 1000, perMinute: 500 },
    maxMembers: 50,
    maxApiKeys: 25,
    maxOriginsPerKey: 10,
    sync: true,
  },
};

// PLANS is written from lowest to highest, so its key order is the plan order.
export function isHigherPlan(plan: PlanKey, than: PlanKey): boolean {
  return (
    (Object.keys(PLANS) as PlanKey[]).indexOf(plan) >
    (Object.keys(PLANS) as PlanKey[]).indexOf(than)
  );
}

export const LOCATION_SLOTS = {
  included: 1,
  selfServeCap: 10,
};
