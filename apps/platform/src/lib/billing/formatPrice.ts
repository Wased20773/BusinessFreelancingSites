import type { PriceJson } from "@/types/types";

/*
 *   Formats a Stripe price for display, e.g. { amount: 12, currency: "usd" }
 *   becomes "$12.00".
 **/
export function formatPrice(price: PriceJson): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency,
  }).format(price.amount);
}
