"use client";

import { buyLocationSlot } from "@/lib/api/billing";
import { requestError } from "@/lib/api/requestError";
import { formatPrice } from "@/lib/billing/formatPrice";
import { LOCATION_SLOTS } from "@/lib/billing/plans";
import type { BillingJson, BillingPricesJson } from "@/types/types";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LocationSlotsCardProps = {
  billing: BillingJson;
  price: BillingPricesJson;
  businessId: string;
};

export default function LocationSlotsCard({
  billing,
  price,
  businessId,
}: LocationSlotsCardProps) {
  const [isBuying, setIsBuying] = useState<boolean>(false);

  const { locations, locationSlots } = billing.usage;
  const purchased = locationSlots - LOCATION_SLOTS.included;
  const isFull = locations >= locationSlots;
  const atCap = locationSlots >= billing.selfServeSlotCap;
  const percentUsed = Math.min(100, (locations / locationSlots) * 100);

  // A one-time payment through Stripe Checkout, which is the confirmation step.
  async function handleBuySlot() {
    setIsBuying(true);

    try {
      const url = await toast
        .promise(buyLocationSlot(businessId), {
          loading: "Opening checkout...",
          success: "Redirecting to Stripe...",
          error: requestError("Failed to open checkout."),
        })
        .unwrap();

      // Leaving the page, so isBuying stays set.
      window.location.assign(url);
    } catch (error) {
      console.error("Error buying a location slot:", error);
      setIsBuying(false);
    }
  }

  return (
    <div>
      <h2
        id="location-slots-heading"
        className="text-base font-semibold text-gray-900 ml-5"
      >
        Location Slots
      </h2>

      <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-[0.15rem] border-dashed border-gray-300 pb-3">
          <div>
            <p className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <MapPin size={20} className="text-gray-500" />
              {locations} of {locationSlots} locations used
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {LOCATION_SLOTS.included} included
              {purchased > 0 && ` + ${purchased} purchased`}
            </p>
          </div>

          <p className="text-base text-gray-600">
            <span className="font-semibold text-gray-900">
              {formatPrice(price.locationSlot)}
            </span>{" "}
            one-time per slot
          </p>
        </div>

        {/* Usage bar */}
        <div
          role="progressbar"
          aria-label="Location slots used"
          aria-valuemin={0}
          aria-valuemax={locationSlots}
          aria-valuenow={locations}
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
        >
          <div
            className={`h-full rounded-full ${isFull ? "bg-amber-500" : "bg-sky-500"}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>

        <p className="text-sm text-gray-600">
          Each location needs a slot. Slots belong to the business and stay
          even if the plan ends. One-time payment, non-refundable.
        </p>

        {atCap ? (
          // TODO(billing): link to a contact page or support email once one exists.
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            This business has reached {billing.selfServeSlotCap} location
            slots. Contact us to add more.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleBuySlot()}
              disabled={isBuying}
              className="rounded-xl bg-sky-500 px-5 py-3 font-medium text-white outline-none transition-colors hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBuying ? "Working..." : "Buy a slot"}
            </button>

            {isFull && (
              <p className="text-sm text-amber-600">
                All slots are in use. Buy a slot to add another location.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
