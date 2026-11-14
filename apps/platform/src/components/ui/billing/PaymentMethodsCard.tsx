"use client";

import { addPaymentMethod, removePaymentMethod } from "@/lib/api/billing";
import { requestError } from "@/lib/api/requestError";
import type { AccountPaymentMethodJson } from "@/types/types";
import { CreditCard, Link2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PaymentMethodsCardProps = {
  paymentMethods: AccountPaymentMethodJson[];
  // Reloads the billing data after a change.
  onChanged: () => Promise<void>;
};

export default function PaymentMethodsCard({
  paymentMethods,
  onChanged,
}: PaymentMethodsCardProps) {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // The card number is typed on Stripe's page, never in our app.
  async function handleAdd() {
    setIsAdding(true);

    try {
      const url = await toast
        .promise(addPaymentMethod(), {
          loading: "Opening Stripe...",
          success: "Redirecting to Stripe...",
          error: requestError("Failed to start adding a card."),
        })
        .unwrap();

      window.location.assign(url);
    } catch (error) {
      console.error("Error starting to add a card:", error);
      setIsAdding(false);
    }
  }

  async function handleRemove(paymentMethod: AccountPaymentMethodJson) {
    setRemovingId(paymentMethod.id);

    try {
      await toast
        .promise(removePaymentMethod(paymentMethod.id), {
          loading: `Removing ${paymentMethod.label}...`,
          success: `${paymentMethod.label} was removed.`,
          error: requestError("Failed to remove the payment method."),
        })
        .unwrap();

      await onChanged();
    } catch (error) {
      console.error("Error removing payment method:", error);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section
      aria-labelledby="payment-methods-heading"
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="payment-methods-heading"
            className="text-base font-semibold text-gray-900"
          >
            Payment methods
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Your saved cards. Pick which one pays each plan under Your
            subscriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isAdding}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={14} />
          {isAdding ? "Opening..." : "Add a card"}
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No saved cards yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-200">
          {paymentMethods.map((paymentMethod) => {
            const isPayingForPlan = paymentMethod.usedBy.length > 0;

            return (
              <li
                key={paymentMethod.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
              >
                {paymentMethod.type === "link" ? (
                  <Link2 size={18} className="shrink-0 text-emerald-600" />
                ) : (
                  <CreditCard size={18} className="shrink-0 text-gray-500" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-medium break-all text-gray-900">
                    {paymentMethod.label}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isPayingForPlan
                      ? `Pays for ${paymentMethod.usedBy.join(", ")}`
                      : "Not used by any plan"}
                    {paymentMethod.expires &&
                      ` · Expires ${paymentMethod.expires}`}
                  </p>
                </div>

                {/* A card paying for a plan can't be removed until the
                    plan switches to another card (the server checks too). */}
                <button
                  type="button"
                  onClick={() => handleRemove(paymentMethod)}
                  disabled={isPayingForPlan || removingId !== null}
                  title={
                    isPayingForPlan
                      ? "Switch the plan to another card first."
                      : undefined
                  }
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
                >
                  {removingId === paymentMethod.id ? "Removing..." : "Remove"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
