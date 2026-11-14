"use client";

import { openBillingPortal } from "@/lib/api/billing";
import { formatPrice } from "@/lib/billing/formatPrice";
import { PLANS_NAMES } from "@/lib/billing/plans";
import { formatDateTime } from "@/lib/time/formatDateTime";
import type { BillingJson, BillingPricesJson } from "@/types/types";
import axios from "axios";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CheckInclude from "../CheckInclude";

type CurrentPlanCardProps = {
  billing: BillingJson;
  price: BillingPricesJson;
  businessId: string;
};

export default function CurrentPlanCard({
  billing,
  price,
  businessId,
}: CurrentPlanCardProps) {
  const [isOpeningPortal, setIsOpeningPortal] = useState<boolean>(false);

  const subscription = billing.subscription;

  // planKey is the plan the business actually has right now:
  // "free" when it never paid, or when its subscription ended.
  const isPaid = billing.planKey !== "free";

  async function handleManageBilling() {
    setIsOpeningPortal(true);

    try {
      const url = await toast
        .promise(openBillingPortal(businessId), {
          loading: "Opening billing portal...",
          success: "Redirecting to Stripe...",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to open the billing portal.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while opening the billing portal.",
            };
          },
        })
        .unwrap();

      window.location.href = url;
    } catch (error) {
      console.error("Error opening the billing portal:", error);
      setIsOpeningPortal(false);
    }
  }

  function renderStatus() {
    if (!subscription) {
      return (
        <p className="mt-1 text-sm text-gray-600">
          This business is on the Free plan.
        </p>
      );
    }

    const periodEnd = formatDateTime(subscription.currentPeriodEnd, "date");

    // Had a subscription, but it ended (cancelled, or the payment failed for good).
    if (!isPaid) {
      return (
        <p className="mt-1 text-sm text-gray-600">
          The {PLANS_NAMES[subscription.tier]} plan ended on {periodEnd}. This
          business is on the Free plan.
        </p>
      );
    }

    // The payer left or was removed; their subscription stops at the period end.
    if (!subscription.payerIsMember && subscription.cancelAtPeriodEnd) {
      const payerName = subscription.payer.name ?? subscription.payer.email;

      return (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {payerName} left the business, so this plan ends on {periodEnd}.
          Anyone in the business can subscribe to any plan below to keep it.
        </p>
      );
    }

    if (subscription.status === "past_due") {
      return (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-red-600"
        >
          The last payment failed. Stripe is retrying the card; update it in
          Manage billing to keep this plan.
        </p>
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return (
        <p className="mt-1 text-sm text-orange-400">
          Cancelled. Ends on {periodEnd}, then this business moves to the Free
          plan. Anyone in the business can subscribe to any plan below to keep
          it.
        </p>
      );
    }

    return (
      <p className="mt-1 text-sm text-emerald-500">Renews on {periodEnd}</p>
    );
  }

  return (
    <div>
      <h2
        id="business-billing-heading"
        className="text-base font-semibold text-gray-900 ml-5"
      >
        Current Plan
      </h2>

      <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-[0.15rem] border-dashed border-gray-300 pb-3">
          <div>
            <h3 className="flex flex-col text-gray-900">
              {PLANS_NAMES[billing.planKey]}
              {isPaid && subscription && (
                <span className="ml-2 text-base font-normal text-gray-600">
                  {formatPrice(price.tiers[subscription.tier])}/month
                </span>
              )}
            </h3>

            {renderStatus()}
          </div>

          {subscription?.isPayer && (
            <button
              type="button"
              onClick={() => void handleManageBilling()}
              disabled={isOpeningPortal}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOpeningPortal ? "Opening..." : "Manage billing"}
            </button>
          )}
        </div>

        {/* The payer badge: everyone can see who is covering the business. */}
        {isPaid && subscription && (
          <div className="w-fit flex items-center gap-2 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-sm text-amber-900">
            <Star size={14} className="fill-amber-500 text-amber-500" />
            <span>
              Paid by{" "}
              <span className="font-medium">
                {subscription.payer.name ?? subscription.payer.email}
              </span>
              {subscription.isPayer && " (you)"}
            </span>
          </div>
        )}

        {/* The usage of the plan */}
        <div className="flex flex-col gap-2 px-3">
          <CheckInclude
            content={`Invite up to ${billing.limits.maxMembers} members`}
            variant="included"
          />

          <CheckInclude
            content={`API rate limit of ${billing.limits.rateLimit.burst} burst ${billing.limits.rateLimit.perMinute}/min`}
            variant="included"
          />
          <CheckInclude
            content={`Create up to ${billing.limits.maxApiKeys} API keys`}
            variant="included"
          />
          <CheckInclude
            content={`Allow up to ${billing.limits.maxOriginsPerKey} origins per API key`}
            variant="included"
          />
          <CheckInclude
            content={
              billing.limits.sync ? "Synchronization feature" : "No sync"
            }
            variant={billing.limits.sync ? "included" : "not-included"}
          />
        </div>
      </div>
    </div>
  );
}
