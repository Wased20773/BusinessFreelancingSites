"use client";

import AccountBillingSkeleton from "@/components/ui/billing/AccountBillingSkeleton";
import { motion } from "motion/react";
import { cardMotion, listRowMotion } from "@/components/motion/listMotion";
import PaymentMethodsCard from "@/components/ui/billing/PaymentMethodsCard";
import PaymentHistory from "@/components/ui/billing/PaymentHistory";
import {
  getAccountBilling,
  getBillingPrices,
  hideSubscription,
  setPlanPaymentMethod,
} from "@/lib/api/billing";
import { requestError } from "@/lib/api/requestError";
import { formatPrice } from "@/lib/billing/formatPrice";
import { PLANS_NAMES } from "@/lib/billing/plans";
import { formatDateTime } from "@/lib/time/formatDateTime";
import type { AccountBillingJson, BillingPricesJson } from "@/types/types";
import axios from "axios";
import { Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CARD = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";

// Stripe sends the user back here after adding a card.
const CARD_RETURN_TOASTS: Record<
  string,
  { type: "success" | "info"; message: string }
> = {
  added: { type: "success", message: "Card saved. Nothing was charged." },
  cancelled: { type: "info", message: "No card was added." },
};

export default function AccountBillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [billing, setBilling] = useState<AccountBillingJson | null>(null);
  const [prices, setPrices] = useState<BillingPricesJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The business whose plan is switching cards right now.
  const [switchingBusinessId, setSwitchingBusinessId] = useState<string | null>(
    null,
  );

  // The removed-from business being hidden from the list right now.
  const [hidingBusinessId, setHidingBusinessId] = useState<string | null>(
    null,
  );

  // Read once on arrival: did Stripe just send the user back here?
  const [cardReturn] = useState(
    () => CARD_RETURN_TOASTS[searchParams.get("card") ?? ""] ?? null,
  );

  useEffect(() => {
    if (!cardReturn) return;

    // The id stops the toast from showing twice in dev (Strict Mode).
    toast[cardReturn.type](cardReturn.message, { id: "card-return" });

    // Clear the query so a refresh doesn't show the toast again.
    router.replace(pathname);
  }, [cardReturn, router, pathname]);

  // Reloads after a change, without the full-page loading bar.
  async function refreshBilling() {
    try {
      setBilling(await getAccountBilling());
    } catch (error) {
      console.error("Error reloading account billing:", error);
      toast.error("Failed to reload your billing. Refresh the page.");
    }
  }

  async function handleHide(businessId: string) {
    setHidingBusinessId(businessId);

    try {
      await toast
        .promise(hideSubscription(businessId), {
          loading: "Removing it from your list...",
          success: "Removed from your list.",
          error: requestError("Failed to remove it from your list."),
        })
        .unwrap();

      await refreshBilling();
    } catch (error) {
      console.error("Error hiding the subscription:", error);
    } finally {
      setHidingBusinessId(null);
    }
  }

  async function handleSwitchCard(businessId: string, paymentMethodId: string) {
    setSwitchingBusinessId(businessId);

    try {
      await toast
        .promise(setPlanPaymentMethod(businessId, paymentMethodId), {
          loading: "Switching the card...",
          success: "Card switched. Your next renewal uses it.",
          error: requestError("Failed to switch the card."),
        })
        .unwrap();

      await refreshBilling();
    } catch (error) {
      console.error("Error switching the plan's card:", error);
    } finally {
      setSwitchingBusinessId(null);
    }
  }

  useEffect(() => {
    async function loadBilling() {
      try {
        const [accountBilling, billingPrices] = await toast
          .promise(Promise.all([getAccountBilling(), getBillingPrices()]), {
            loading: "Loading your billing...",
            success: "Billing loaded.",
            error: requestError("Failed to load your billing."),
          })
          .unwrap();

        setBilling(accountBilling);
        setPrices(billingPrices);
      } catch (error) {
        console.error("Error loading account billing:", error);

        setErrorMessage(
          axios.isAxiosError<{ error?: string }>(error)
            ? (error.response?.data?.error ?? "Failed to load your billing.")
            : "Failed to load your billing.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadBilling();
  }, []);

  if (isLoading) return <AccountBillingSkeleton />;

  if (errorMessage || !billing || !prices) {
    return (
      <p className="p-5">{errorMessage ?? "Failed to load your billing."}</p>
    );
  }

  // Credit rows aren't payments; they only move money into account credit.
  const paymentCount = billing.payments.filter(
    (payment) => payment.kind !== "credit",
  ).length;

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="account-billing-heading"
    >
      <div className="mb-6">
        <h1 id="account-billing-heading" className="text-3xl font-semibold">
          Billing
        </h1>
        <p className="mt-1 text-gray-500">
          Everything you pay for, across all of your businesses. To change a
          plan or buy a slot, go to that business&apos;s Billing page.
        </p>
      </div>

      <div className="space-y-5">
        {/* Total spent */}
        <motion.section
          {...cardMotion(0)}
          aria-labelledby="total-spent-heading"
          className={CARD}
        >
          <h2
            id="total-spent-heading"
            className="text-sm font-medium text-gray-500"
          >
            Total spent
          </h2>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {billing.totals.length === 0
              ? formatPrice({ amount: 0, currency: "usd" })
              : billing.totals.map(formatPrice).join(" + ")}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Charged to your card · {paymentCount}{" "}
            {paymentCount === 1 ? "payment" : "payments"}
          </p>
          {billing.credit && (
            <p className="mt-1 text-sm font-medium text-emerald-600">
              Account credit: {formatPrice(billing.credit)}. It&apos;s used
              before your card on your next payments.
            </p>
          )}
        </motion.section>

        {/* Subscriptions this user pays for, with their next renewal */}
        <motion.section
          {...cardMotion(1)}
          aria-labelledby="subscriptions-heading"
          className={CARD}
        >
          <h2
            id="subscriptions-heading"
            className="text-base font-semibold text-gray-900"
          >
            Your subscriptions
          </h2>

          {billing.subscriptions.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              You don&apos;t pay for any business right now.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-200">
              {billing.subscriptions.map((subscription, index) => {
                const periodEnd = formatDateTime(
                  subscription.currentPeriodEnd,
                  "date",
                );

                return (
                  <motion.li
                    key={subscription.businessId}
                    {...listRowMotion(index)}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-gray-900">
                        <Star
                          size={14}
                          className="shrink-0 fill-amber-500 text-amber-500"
                        />
                        <span className="truncate">
                          {subscription.businessName}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {PLANS_NAMES[subscription.tier]} ·{" "}
                        {formatPrice(prices.tiers[subscription.tier])}/month
                      </p>
                      <p
                        className={`text-sm ${
                          subscription.status === "past_due"
                            ? "text-red-600"
                            : subscription.cancelAtPeriodEnd
                              ? "text-orange-500"
                              : "text-emerald-600"
                        }`}
                      >
                        {subscription.status === "past_due"
                          ? "Payment failed. Pick another card below, or add one."
                          : subscription.cancelAtPeriodEnd
                            ? `Cancelled. Ends on ${periodEnd}`
                            : `Renews on ${periodEnd}`}
                      </p>

                      {/* Which saved card pays this plan. No charge.
                          A plan that's ending won't charge again, so no picker. */}
                      {billing.paymentMethods.length > 0 &&
                        !subscription.cancelAtPeriodEnd && (
                          <label className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            Paid with
                            <select
                              value={subscription.paymentMethodId ?? ""}
                              disabled={switchingBusinessId !== null}
                              onChange={(event) =>
                                handleSwitchCard(
                                  subscription.businessId,
                                  event.target.value,
                                )
                              }
                              className="max-w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 disabled:opacity-60"
                            >
                              {!subscription.paymentMethodId && (
                                <option value="" disabled>
                                  Choose a card
                                </option>
                              )}
                              {billing.paymentMethods.map((paymentMethod) => (
                                <option
                                  key={paymentMethod.id}
                                  value={paymentMethod.id}
                                >
                                  {paymentMethod.label}
                                  {paymentMethod.expires &&
                                    ` (exp ${paymentMethod.expires})`}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                    </div>

                    {/* A removed payer can't open the business anymore. */}
                    {subscription.isMember ? (
                      <Link
                        href={`/businesses/${subscription.businessId}/billing`}
                        className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Manage
                      </Link>
                    ) : (
                      <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="min-w-0 flex-1 text-sm text-gray-600">
                          {/* One string, so line breaks can't eat the spaces. */}
                          {`You were removed from this business, so you can't manage it anymore. Your plan ends on ${periodEnd} and won't charge you again.`}
                        </p>

                        {/* Only hides it from this list; the plan still
                            runs until it ends. */}
                        <button
                          type="button"
                          onClick={() => handleHide(subscription.businessId)}
                          disabled={hidingBusinessId !== null}
                          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {hidingBusinessId === subscription.businessId
                            ? "Removing..."
                            : "Remove from list"}
                        </button>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* Every payment, newest first, 10 per page with date filters */}
        <motion.section
          {...cardMotion(2)}
          aria-labelledby="payment-history-heading"
          className={CARD}
        >
          <PaymentHistory payments={billing.payments} />
        </motion.section>

        <motion.div {...cardMotion(3)}>
          <PaymentMethodsCard
            paymentMethods={billing.paymentMethods}
            onChanged={refreshBilling}
          />
        </motion.div>
      </div>
    </section>
  );
}
