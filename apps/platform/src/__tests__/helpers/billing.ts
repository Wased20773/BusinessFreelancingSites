import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

/*
 *   Sets the plan getBusinessPlan returns for the business under test.
 *
 *   The test file must mock the module itself (jest.mock is hoisted per file),
 *   keeping planLimitResponse real:
 *
 *     jest.mock("@/lib/billing/getBusinessPlan", () => ({
 *       ...jest.requireActual("@/lib/billing/getBusinessPlan"),
 *       getBusinessPlan: jest.fn(),
 *     }));
 **/
export function mockBusinessPlan(planKey: PlanKey = "free", locationSlots = 1) {
  jest.mocked(getBusinessPlan).mockResolvedValue({
    planKey,
    limits: PLANS[planKey],
    locationSlots,
  });
}
