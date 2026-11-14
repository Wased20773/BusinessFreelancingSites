/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  USER_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getStripe } from "@/lib/billing/stripe";

import { PATCH } from "@/app/api/businesses/[businessId]/billing/payment-method/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/billing/payment-method`;
const context = createRouteContext({ businessId: BUSINESS_ID });

const mockRetrievePaymentMethod = jest.fn();
const mockUpdateSubscription = jest.fn();

function switchCard(body: unknown) {
  return PATCH(createJsonRequest({ url: URL, method: "PATCH", body }), context);
}

function payerSubscription(status = "active", payerId = USER_ID) {
  mockPrisma.subscription.findUnique.mockResolvedValue({
    payerId,
    stripeSubscriptionId: "sub_123",
    tier: "familyBusiness",
    status,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getStripe).mockReturnValue({
    paymentMethods: { retrieve: mockRetrievePaymentMethod },
    subscriptions: { update: mockUpdateSubscription },
  } as never);

  mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
});

describe("PATCH /api/businesses/[businessId]/billing/payment-method", () => {
  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await switchCard({ paymentMethodId: "pm_1" });

    expect(response.status).toBe(401);
  });

  it("returns 400 without a payment method", async () => {
    mockSuccessfulAuthentication();

    const response = await switchCard({});

    expect(response.status).toBe(400);
    expect(mockUpdateSubscription).not.toHaveBeenCalled();
  });

  it("returns 403 when the user isn't the payer", async () => {
    mockSuccessfulAuthentication();
    payerSubscription("active", "someone-else");

    const response = await switchCard({ paymentMethodId: "pm_1" });

    expect(response.status).toBe(403);
    expect(mockUpdateSubscription).not.toHaveBeenCalled();
  });

  it("returns 409 when the plan has ended", async () => {
    mockSuccessfulAuthentication();
    payerSubscription("canceled");

    const response = await switchCard({ paymentMethodId: "pm_1" });

    expect(response.status).toBe(409);
    expect(mockUpdateSubscription).not.toHaveBeenCalled();
  });

  it("returns 404 for a payment method the payer didn't save", async () => {
    mockSuccessfulAuthentication();
    payerSubscription();
    mockRetrievePaymentMethod.mockResolvedValue({
      id: "pm_other",
      customer: "cus_someone_else",
    });

    const response = await switchCard({ paymentMethodId: "pm_other" });

    expect(response.status).toBe(404);
    expect(mockUpdateSubscription).not.toHaveBeenCalled();
  });

  it("returns 404 when Stripe has no such payment method", async () => {
    mockSuccessfulAuthentication();
    payerSubscription();
    mockRetrievePaymentMethod.mockRejectedValue(new Error("No such PaymentMethod"));

    const response = await switchCard({ paymentMethodId: "pm_missing" });

    expect(response.status).toBe(404);
  });

  it("switches the plan's card without charging anything", async () => {
    mockSuccessfulAuthentication();
    payerSubscription();
    mockRetrievePaymentMethod.mockResolvedValue({
      id: "pm_new",
      customer: "cus_123",
    });

    const response = await switchCard({ paymentMethodId: "pm_new" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paymentMethodId: "pm_new" });

    // Only the card changes: no price change, so no invoice or charge.
    expect(mockUpdateSubscription).toHaveBeenCalledWith("sub_123", {
      default_payment_method: "pm_new",
    });
  });

  it("returns 500 when Stripe fails", async () => {
    mockSuccessfulAuthentication();
    payerSubscription();
    mockRetrievePaymentMethod.mockResolvedValue({ id: "pm_new", customer: "cus_123" });
    mockUpdateSubscription.mockRejectedValue(new Error("Stripe is down"));

    const response = await switchCard({ paymentMethodId: "pm_new" });

    expect(response.status).toBe(500);
  });
});
