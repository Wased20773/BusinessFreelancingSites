"use client";

import { startCheckout, switchPlan } from "@/lib/api/billing";
import { formatPrice } from "@/lib/billing/formatPrice";
import { isHigherPlan, PlanKey, PLANS, PLANS_NAMES } from "@/lib/billing/plans";
import { BillingJson, BillingPricesJson } from "@/types/types";
import type { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import axios from "axios";
import { useState } from "react";
import CheckInclude from "../CheckInclude";
import { toast } from "sonner";

// Shared toast error for both requests below.
function requestError(failedMessage: string) {
  return (error: unknown) => {
    if (axios.isAxiosError<{ error?: string }>(error)) {
      return {
        message: failedMessage,
        description:
          error.response?.data?.error ??
          `Status code: ${error.response?.status ?? "No response"}`,
      };
    }

    return {
      message: "Unexpected error.",
      description: "Something went wrong, please try again.",
    };
  };
}

const PLAN_STYLES: Record<
  PlanKey,
  { card: string; title: string; current: string; button: string }
> = {
  free: {
    card: "border-gray-200 bg-white",
    title: "text-slate-700",
    current: "ring-2 ring-slate-400",
    button: "bg-gray-300 text-slate-900",
  },
  familyBusiness: {
    card: "border-emerald-300 bg-emerald-200/40",
    title: "text-emerald-700",
    current: "ring-2 ring-emerald-500",
    button: "bg-emerald-300 text-emerald-900",
  },
  localBusiness: {
    card: "border-sky-300 bg-sky-200/40",
    title: "text-sky-700",
    current: "ring-2 ring-sky-500",
    button: "bg-sky-300 text-sky-900",
  },
  growingBusiness: {
    card: "border-violet-300 bg-violet-200/40",
    title: "text-violet-700",
    current: "ring-2 ring-violet-500",
    button: "bg-violet-300 text-violet-900",
  },
};

type PlansCardProps = {
  billing: BillingJson;
  price: BillingPricesJson;
  businessId: string;
};

export default function PlansCard({
  billing,
  price,
  businessId,
}: PlansCardProps) {
  // The tier whose request is running; every button is disabled meanwhile.
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);

  // Subscribe or take over: a new subscription through Stripe Checkout.
  async function sendToCheckout(tier: PlanTier) {
    setPendingTier(tier);

    try {
      const url = await toast
        .promise(startCheckout(businessId, tier), {
          loading: "Opening checkout...",
          success: "Redirecting to Stripe...",
          error: requestError("Failed to open checkout."),
        })
        .unwrap();

      // Leaving the page, so pendingTier stays set.
      window.location.assign(url);
    } catch (error) {
      console.error("Error starting checkout:", error);
      setPendingTier(null);
    }
  }

  // The payer confirms the upgrade or downgrade on Stripe's page,
  // which shows the prorated charge or credit before anything changes.
  async function changePlan(tier: PlanTier) {
    setPendingTier(tier);

    try {
      const url = await toast
        .promise(switchPlan(businessId, tier), {
          loading: "Opening plan change...",
          success: "Redirecting to Stripe...",
          error: requestError("Failed to open the plan change."),
        })
        .unwrap();

      // Leaving the page, so pendingTier stays set.
      window.location.assign(url);
    } catch (error) {
      console.error("Error switching plans:", error);
      setPendingTier(null);
    }
  }

  async function handlePlanClick(planKey: PlanKey) {
    if (planKey === "free") return;

    const subscription = billing.subscription;
    const isPaid = billing.planKey !== "free";

    if (!isPaid) {
      await sendToCheckout(planKey);
      return;
    }

    if (subscription?.isPayer) {
      await changePlan(planKey);
      return;
    }

    if (!isHigherPlan(planKey, billing.planKey)) {
      toast.error("You can't switch to this plan.", {
        description: `Only ${subscription?.payer.name ?? "the current payer"} can keep or lower the plan. To take over, pick a higher plan.`,
      });
      return;
    }

    await sendToCheckout(planKey);
  }

  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-3">
      {(Object.keys(PLANS) as PlanKey[]).map((planKey) => {
        const isCurrent = planKey === billing.planKey;

        return (
          <div
            key={planKey}
            className={`flex flex-col border p-5 rounded-2xl shadow-sm sm:p-6 ${PLAN_STYLES[planKey].card} ${isCurrent ? PLAN_STYLES[planKey].current : ""}`}
          >
            {/* Heading */}
            <div className="mb-3 text-center sm:text-left">
              <h3 className="flex flex-col">
                {PLANS_NAMES[planKey]}
                <span className="text-base font-normal text-gray-600">
                  {planKey === "free"
                    ? "$0"
                    : `${formatPrice(price.tiers[planKey])}/month`}
                </span>
              </h3>

              <p className="text-gray-600">
                {planKey === "free"
                  ? "For trying things out and small personal projects."
                  : planKey === "familyBusiness"
                    ? "For family-owned businesses with a small team running one website."
                    : planKey === "localBusiness"
                      ? "For established local businesses with a bigger team and several sites or apps using the API."
                      : planKey === "growingBusiness" &&
                        "Our highest limits, for businesses that are scaling: large teams, many integrations, heavy traffic."}
              </p>
            </div>

            {/* What it includes */}
            <div className="flex flex-col gap-2 mb-auto">
              <CheckInclude
                content={`Up to ${PLANS[planKey].maxMembers} members`}
                variant={planKey === "free" ? "unchanged" : "included"}
              />
              <CheckInclude
                content={`API rate limit of ${PLANS[planKey].rateLimit.burst} burst ${PLANS[planKey].rateLimit.perMinute}/min`}
                variant={planKey === "free" ? "unchanged" : "included"}
              />
              <CheckInclude
                content={`Up to ${PLANS[planKey].maxApiKeys} API keys`}
                variant={planKey === "free" ? "unchanged" : "included"}
              />
              <CheckInclude
                content={`Up to ${PLANS[planKey].maxOriginsPerKey} origins per API key`}
                variant={planKey === "free" ? "unchanged" : "included"}
              />
              <CheckInclude
                content="Synchronization feature"
                variant={PLANS[planKey].sync ? "included" : "not-included"}
              />
            </div>

            {planKey !== "free" && (
              <button
                type="button"
                className={`rounded-xl py-3 mt-5 ${isCurrent ? "opacity-50 " : ""}${PLAN_STYLES[planKey].button}`}
                disabled={isCurrent || pendingTier !== null}
                onClick={() => void handlePlanClick(planKey)}
              >
                {isCurrent
                  ? "Currently Active"
                  : pendingTier === planKey
                    ? "Working..."
                    : "Subscribe"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
