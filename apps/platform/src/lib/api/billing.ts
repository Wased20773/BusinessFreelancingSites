import type { BillingJson, BillingPricesJson } from "@/types/types";
import type { PlanTier } from "@business-freelancer/database/generated/prisma/enums";
import axios from "axios";

export async function getBilling(businessId: string) {
  return axios
    .get<BillingJson>(`/api/businesses/${businessId}/billing`)
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

export async function switchPlan(businessId: string, tier: PlanTier) {
  return axios
    .post<{ url: string }>(`/api/businesses/${businessId}/billing/switch`, {
      tier,
    })
    .then((response) => response.data.url);
}
