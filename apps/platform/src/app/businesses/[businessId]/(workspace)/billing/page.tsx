"use client";

import CurrentPlanCard from "@/components/ui/billing/CurrentPlanCard";
import PlansCard from "@/components/ui/billing/PlansCard";
import PageState from "@/components/ui/PageState";
import { getBilling, getBillingPrices } from "@/lib/api/billing";
import type { BillingJson, BillingPricesJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/*
 *   Stripe sends the user back here with one of these in the URL
 *   (see the success/cancel/return URLs in the billing routes).
 **/
const STRIPE_RETURN_TOASTS: Record<
  string,
  { type: "success" | "info"; message: string }
> = {
  "checkout=success": {
    type: "success",
    message: "Payment received. Your plan is now active.",
  },
  "checkout=cancelled": {
    type: "info",
    message: "Checkout cancelled. Nothing was charged.",
  },
  "switch=success": { type: "success", message: "Your plan was changed." },
  "slot=success": {
    type: "success",
    message: "Payment received. You have a new location slot.",
  },
  "slot=cancelled": {
    type: "info",
    message: "Purchase cancelled. Nothing was charged.",
  },
};

export default function BillingPage() {
  const params = useParams<{ businessId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const businessId = params.businessId;

  const { data: session, status } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentBillingData, setCurrentBillingData] =
    useState<BillingJson | null>(null);
  const [billingPriceData, setBillingPriceData] =
    useState<BillingPricesJson | null>(null);

  // Read once on arrival: did Stripe just send the user back here?
  const [stripeReturn] = useState(() => {
    const returned = ["checkout", "switch", "slot"]
      .map((key) => `${key}=${searchParams.get(key)}`)
      .find((pair) => pair in STRIPE_RETURN_TOASTS);

    return returned ? STRIPE_RETURN_TOASTS[returned] : null;
  });

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageBilling =
    currentAccessLevel === "staff" ||
    currentAccessLevel === "admin" ||
    currentAccessLevel === "owner" ||
    currentAccessLevel === "developer";

  useEffect(() => {
    async function loadBilling() {
      try {
        const [billing, prices] = await toast
          .promise(Promise.all([getBilling(businessId), getBillingPrices()]), {
            loading: "Loading billing info...",
            success: "Billing info loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load billing info.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Somthing went wrong while loading the billing info.",
              };
            },
          })
          .unwrap();

        setCurrentBillingData(billing);
        setBillingPriceData(prices);
        setErrorMessage(null);
      } catch (error) {
        console.error("Error in Current Business Billing page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ??
              "Failed to load current billing info.",
          );
        } else {
          setErrorMessage("Failed to load current billing info");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status !== "authenticated" || !canManageBilling) return;

    /*
     * After a successful payment, the webhook that saves it often lands a
     * second or two after the redirect, so wait before the one fetch.
     */
    const delay = stripeReturn?.type === "success" ? 2000 : 0;
    const timer = setTimeout(() => void loadBilling(), delay);

    return () => clearTimeout(timer);
  }, [businessId, status, canManageBilling, stripeReturn]);

  // Coming back from a Stripe page: show what happened.
  useEffect(() => {
    if (!stripeReturn) return;

    // The id stops the toast from showing twice in dev (Strict Mode).
    toast[stripeReturn.type](stripeReturn.message, { id: "stripe-return" });

    // Clear the query so a refresh doesn't show the toast again.
    router.replace(pathname);
  }, [stripeReturn, router, pathname]);

  const pageState = PageState({
    status,
    isLoading,
    canView: canManageBilling,
    pageTitle: "Billing",
    reason: "Something might've gone wrong, please try again later.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!currentBillingData || !billingPriceData) {
    return (
      <p className="p-5">
        Billing data could not be found properly. Try again later.
      </p>
    );
  }

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="billing-heading"
    >
      <div className="mb-6">
        <h1 id="billing-heading" className="text-3xl font-semibold">
          Billing
        </h1>
        <p className="mt-1 text-gray-500">
          Pay for the business&apos;s subscription and location slots. Payers
          are pinned and given a badge on purchase per business.
        </p>
      </div>

      <div className="space-y-5">
        <section aria-labelledby="business-billing-heading">
          <CurrentPlanCard
            billing={currentBillingData}
            price={billingPriceData}
            businessId={businessId}
          />

          <div className="mt-8">
            <div className="mb-6">
              <h2>Subscription Plans</h2>
              <p className="mt-1 text-gray-500">
                Anyone in this business can subscribe. If someone else already
                pays, you can take over with a higher plan; their subscription
                is cancelled right away with no refund. Only the current payer
                can switch to a lower plan. When the payer switches, they pay or
                get credit only for the time left in the month.
              </p>

              <p className="mt-3 text-amber-500">
                If the plan drops to a lower tier, nothing is removed: extra
                members, API keys, and origins keep working. You must meet the
                requirements your current plan is under
              </p>
            </div>

            <div className="px-3">
              <PlansCard
                billing={currentBillingData}
                price={billingPriceData}
                businessId={businessId}
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
