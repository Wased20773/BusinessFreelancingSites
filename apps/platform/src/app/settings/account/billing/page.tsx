"use client";

import LoadingBar from "@/components/ui/LoadingBar";
import { getAccountBilling, getBillingPrices } from "@/lib/api/billing";
import { requestError } from "@/lib/api/requestError";
import { formatPrice } from "@/lib/billing/formatPrice";
import { PLANS_NAMES } from "@/lib/billing/plans";
import { formatDateTime } from "@/lib/time/formatDateTime";
import type { AccountBillingJson, BillingPricesJson } from "@/types/types";
import axios from "axios";
import { ExternalLink, Receipt, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";

export default function AccountBillingPage() {
  const [billing, setBilling] = useState<AccountBillingJson | null>(null);
  const [prices, setPrices] = useState<BillingPricesJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  if (isLoading) return <LoadingBar />;

  if (errorMessage || !billing || !prices) {
    return (
      <p className="p-5">{errorMessage ?? "Failed to load your billing."}</p>
    );
  }

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
        <section aria-labelledby="total-spent-heading" className={CARD}>
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
            {billing.payments.length}{" "}
            {billing.payments.length === 1 ? "payment" : "payments"} in total
          </p>
        </section>

        {/* Subscriptions this user pays for, with their next renewal */}
        <section aria-labelledby="subscriptions-heading" className={CARD}>
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
              {billing.subscriptions.map((subscription) => {
                const periodEnd = formatDateTime(
                  subscription.currentPeriodEnd,
                  "date",
                );

                return (
                  <li
                    key={subscription.businessId}
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
                          ? "Payment failed. Update your card in Manage billing."
                          : subscription.cancelAtPeriodEnd
                            ? `Cancelled. Ends on ${periodEnd}`
                            : `Renews on ${periodEnd}`}
                      </p>
                    </div>

                    <Link
                      href={`/businesses/${subscription.businessId}/billing`}
                      className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Manage
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Every payment, newest first */}
        <section aria-labelledby="payment-history-heading" className={CARD}>
          <h2
            id="payment-history-heading"
            className="text-base font-semibold text-gray-900"
          >
            Payment history
          </h2>

          {billing.payments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No payments yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-gray-200 text-gray-500">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Business
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Description
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">
                      Amount
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      <span className="sr-only">Receipt</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billing.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                        {formatDateTime(payment.paidAt, "date")}
                      </td>
                      <td className="py-2 pr-3 text-gray-900">
                        {payment.businessName ?? (
                          <span className="italic text-gray-400">
                            Deleted business
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">
                        {payment.description}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium whitespace-nowrap text-gray-900">
                        {formatPrice(payment)}
                      </td>
                      <td className="py-2 text-right">
                        {payment.receiptUrl && (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                          >
                            <Receipt size={14} />
                            Receipt
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
