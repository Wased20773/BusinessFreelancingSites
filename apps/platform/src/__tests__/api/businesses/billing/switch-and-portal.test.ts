/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  USER_ID,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getOrCreateStripeCustomer, getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/syncSubscription";

import { POST as SWITCH } from "@/app/api/businesses/[businessId]/billing/switch/route";
import { POST as PORTAL } from "@/app/api/businesses/[businessId]/billing/portal/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
  getAppUrl: () => "http://localhost:3000",
  getPriceIdForTier: (tier: string) => `price_${tier}`,
}));

jest.mock("@/lib/billing/syncSubscription", () => ({
  syncSubscription: jest.fn(),
}));

const mockRetrieve = jest.fn();
const mockUpdate = jest.fn();
const mockCreatePortalSession = jest.fn();

const context = createRouteContext({ businessId: BUSINESS_ID });

const paidSubscription = {
  payerId: USER_ID,
  stripeSubscriptionId: "sub_123",
  tier: "familyBusiness",
  status: "active",
};

function postSwitch(body: unknown) {
  return SWITCH(
    createJsonRequest({
      url: `http://localhost/api/businesses/${BUSINESS_ID}/billing/switch`,
      method: "POST",
      body,
    }),
    context,
  );
}

function postPortal() {
  return PORTAL(
    createJsonRequest({
      url: `http://localhost/api/businesses/${BUSINESS_ID}/billing/portal`,
      method: "POST",
    }),
    context,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  mockSuccessfulAuthentication();
  jest.mocked(getStripe).mockReturnValue({
    subscriptions: { retrieve: mockRetrieve, update: mockUpdate },
    billingPortal: { sessions: { create: mockCreatePortalSession } },
  } as never);
});

describe("POST /api/businesses/[businessId]/billing/switch", () => {
  it("returns 403 when the user is not the payer", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      ...paidSubscription,
      payerId: "someone-else",
    });

    const response = await postSwitch({ tier: "growingBusiness" });

    expect(response.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when the business is already on that plan", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(paidSubscription);

    const response = await postSwitch({ tier: "familyBusiness" });

    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the subscription has ended", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      ...paidSubscription,
      status: "canceled",
    });

    const response = await postSwitch({ tier: "growingBusiness" });

    expect(response.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("swaps the price on the existing subscription and saves it right away", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(paidSubscription);
    mockRetrieve.mockResolvedValue({
      id: "sub_123",
      items: { data: [{ id: "si_123" }] },
    });

    const response = await postSwitch({ tier: "growingBusiness" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tier: "growingBusiness" });

    expect(mockUpdate).toHaveBeenCalledWith("sub_123", {
      items: [{ id: "si_123", price: "price_growingBusiness" }],
      proration_behavior: "create_prorations",
    });
    expect(syncSubscription).toHaveBeenCalledWith("sub_123");
  });
});

describe("POST /api/businesses/[businessId]/billing/portal", () => {
  it("returns 403 when the user is not the payer", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      ...paidSubscription,
      payerId: "someone-else",
    });

    const response = await postPortal();

    expect(response.status).toBe(403);
    expect(mockCreatePortalSession).not.toHaveBeenCalled();
  });

  it("returns a Customer Portal link for the payer", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(paidSubscription);
    jest.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
    mockCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.com/p/session",
    });

    const response = await postPortal();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://billing.stripe.com/p/session",
    });
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: `http://localhost:3000/businesses/${BUSINESS_ID}/billing`,
    });
  });
});
