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
// Must come after mocks/prisma: it loads getBusinessPlan, which needs mockPrisma.
import { mockBusinessPlan } from "@/__tests__/helpers/billing";
import { getOrCreateStripeCustomer, getStripe } from "@/lib/billing/stripe";

import { POST } from "@/app/api/businesses/[businessId]/billing/checkout/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/billing/getBusinessPlan", () => ({
  ...jest.requireActual("@/lib/billing/getBusinessPlan"),
  getBusinessPlan: jest.fn(),
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
  getAppUrl: () => "http://localhost:3000",
  getPriceIdForTier: (tier: string) => `price_${tier}`,
}));

const mockedGetStripe = jest.mocked(getStripe);
const mockedGetOrCreateStripeCustomer = jest.mocked(getOrCreateStripeCustomer);
const mockCreateSession = jest.fn();

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/billing/checkout`;
const context = createRouteContext({ businessId: BUSINESS_ID });

function postCheckout(body: unknown) {
  return POST(createJsonRequest({ url: URL, method: "POST", body }), context);
}

describe("POST /api/businesses/[businessId]/billing/checkout", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();

    mockBusinessPlan("free");
    mockPrisma.business.findUnique.mockResolvedValue({
      name: "Tacos El Guero",
      subscription: null,
    });
    mockedGetOrCreateStripeCustomer.mockResolvedValue("cus_123");
    mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
    mockedGetStripe.mockReturnValue({
      checkout: { sessions: { create: mockCreateSession } },
    } as never);
  });

  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await postCheckout({ tier: "familyBusiness" });

    expect(response.status).toBe(401);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 400 for a tier that does not exist", async () => {
    mockSuccessfulAuthentication();

    const response = await postCheckout({ tier: "free" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Select a valid plan" });
  });

  it("starts a Stripe Checkout labeled with the business and payer", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "staff");

    const response = await postCheckout({ tier: "localBusiness" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/s",
    });

    expect(mockedGetOrCreateStripeCustomer).toHaveBeenCalledWith(USER_ID);
    expect(mockCreateSession).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_123",
      line_items: [{ price: "price_localBusiness", quantity: 1 }],
      client_reference_id: BUSINESS_ID,
      subscription_data: {
        description: "Tacos El Guero",
        metadata: { businessId: BUSINESS_ID, payerId: USER_ID },
      },
      success_url: `http://localhost:3000/businesses/${BUSINESS_ID}/billing?checkout=success`,
      cancel_url: `http://localhost:3000/businesses/${BUSINESS_ID}/billing?checkout=cancelled`,
    });
  });

  it("returns 409 when the current payer checks out again", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("familyBusiness");
    mockPrisma.business.findUnique.mockResolvedValue({
      name: "Tacos El Guero",
      subscription: { payerId: USER_ID },
    });

    const response = await postCheckout({ tier: "growingBusiness" });

    expect(response.status).toBe(409);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("lets another member take over with a higher plan", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("familyBusiness");
    mockPrisma.business.findUnique.mockResolvedValue({
      name: "Tacos El Guero",
      subscription: { payerId: "someone-else" },
    });

    const response = await postCheckout({ tier: "localBusiness" });

    expect(response.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it.each(["localBusiness", "familyBusiness"])(
    "returns 409 when another member tries to take over with the same or a lower plan (%s)",
    async (tier) => {
      mockSuccessfulAuthentication();
      mockBusinessPlan("localBusiness");
      mockPrisma.business.findUnique.mockResolvedValue({
        name: "Tacos El Guero",
        subscription: { payerId: "someone-else" },
      });

      const response = await postCheckout({ tier });

      expect(response.status).toBe(409);
      expect(mockCreateSession).not.toHaveBeenCalled();
    },
  );

  it("lets another member take over with any plan once the current one is set to end", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("localBusiness");
    mockPrisma.business.findUnique.mockResolvedValue({
      name: "Tacos El Guero",
      subscription: { payerId: "someone-else", cancelAtPeriodEnd: true },
    });

    const response = await postCheckout({ tier: "familyBusiness" });

    expect(response.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it("lets anyone subscribe to any plan once the old subscription has ended", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("free");
    mockPrisma.business.findUnique.mockResolvedValue({
      name: "Tacos El Guero",
      subscription: { payerId: "someone-else" },
    });

    const response = await postCheckout({ tier: "familyBusiness" });

    expect(response.status).toBe(200);
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it("returns 500 when Stripe fails", async () => {
    mockSuccessfulAuthentication();
    mockCreateSession.mockRejectedValue(new Error("Stripe is down"));

    const response = await postCheckout({ tier: "familyBusiness" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to start checkout" });
  });
});
