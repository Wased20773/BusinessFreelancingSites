import type {
  AccountBillingJson,
  BillingJson,
  BillingPricesJson,
} from "@/types/types";
import type { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import axios from "axios";

export async function getBilling(businessId: string) {
  return axios
    .get<BillingJson>(`/api/businesses/${businessId}/billing`)
    .then((response) => response.data);
}

// Everything the signed-in user pays for, across all their businesses.
export async function getAccountBilling() {
  return axios
    .get<AccountBillingJson>("/api/account/billing")
    .then((response) => response.data);
}

export async function getBillingPrices() {
  return axios
    .get<BillingPricesJson>("/api/billing/prices")
    .then((response) => response.data);
}

/*
 *   These all return the Stripe page URL (Checkout or Portal)
 *   to send the browser to.
 **/
export async function startCheckout(businessId: string, tier: PlanTier) {
  return axios
    .post<{ url: string }>(`/api/businesses/${businessId}/billing/checkout`, {
      tier,
    })
    .then((response) => response.data.url);
}

export async function buyLocationSlot(businessId: string) {
  return axios
    .post<{ url: string }>(
      `/api/businesses/${businessId}/billing/slots/checkout`,
    )
    .then((response) => response.data.url);
}

export async function openBillingPortal(businessId: string) {
  return axios
    .post<{ url: string }>(`/api/businesses/${businessId}/billing/portal`)
    .then((response) => response.data.url);
}

// Stripe's page that saves a new card (nothing is charged).
export async function addPaymentMethod() {
  return axios
    .post<{ url: string }>("/api/account/billing/payment-methods")
    .then((response) => response.data.url);
}

// Removes a saved payment method (and saved copies of the same card).
export async function removePaymentMethod(paymentMethodId: string) {
  return axios
    .delete<{ removed: number }>(
      `/api/account/billing/payment-methods/${paymentMethodId}`,
    )
    .then((response) => response.data);
}

// Hides the plan of a business the user was removed from (it still runs).
export async function hideSubscription(businessId: string) {
  return axios
    .post<{ hidden: boolean }>(
      `/api/account/billing/subscriptions/${businessId}/hide`,
    )
    .then((response) => response.data);
}

// Picks which saved payment method pays a business's plan. No charge.
export async function setPlanPaymentMethod(
  businessId: string,
  paymentMethodId: string,
) {
  return axios
    .patch<{ paymentMethodId: string }>(
      `/api/businesses/${businessId}/billing/payment-method`,
      { paymentMethodId },
    )
    .then((response) => response.data);
}

export async function switchPlan(businessId: string, tier: PlanTier) {
  return axios
    .post<{ url: string }>(`/api/businesses/${businessId}/billing/switch`, {
      tier,
    })
    .then((response) => response.data.url);
}
