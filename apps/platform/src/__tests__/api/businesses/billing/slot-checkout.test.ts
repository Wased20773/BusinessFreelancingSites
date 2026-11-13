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
// Must come after mocks/prisma: it loads getBusinessPlan, which needs mockPrisma.
import { mockBusinessPlan } from "@/__tests__/helpers/billing";
import { LOCATION_SLOTS } from "@/lib/billing/plans";
import { getOrCreateStripeCustomer, getStripe } from "@/lib/billing/stripe";

import { POST } from "@/app/api/businesses/[businessId]/billing/slots/checkout/route";

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
  getLocationSlotPriceId: () => "price_slot",
}));

const mockCreateSession = jest.fn();

function postSlotCheckout() {
  return POST(
    createJsonRequest({
      url: `http://localhost/api/businesses/${BUSINESS_ID}/billing/slots/checkout`,
      method: "POST",
    }),
    createRouteContext({ businessId: BUSINESS_ID }),
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "staff");
  mockPrisma.business.findUnique.mockResolvedValue({ name: "Tacos El Guero" });
  jest.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
  mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/s" });
  jest.mocked(getStripe).mockReturnValue({
    checkout: { sessions: { create: mockCreateSession } },
  } as never);
});

describe("POST /api/businesses/[businessId]/billing/slots/checkout", () => {
  it("returns 409 once the business reaches the self-serve slot cap", async () => {
    mockBusinessPlan("free", LOCATION_SLOTS.selfServeCap);

    const response = await postSlotCheckout();

    expect(response.status).toBe(409);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("starts a one-time payment for one slot, labeled with the business and buyer", async () => {
    mockBusinessPlan("free", 1);

    const response = await postSlotCheckout();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/s",
    });

    const metadata = {
      kind: "location_slot",
      businessId: BUSINESS_ID,
      buyerId: USER_ID,
    };

    expect(mockCreateSession).toHaveBeenCalledWith({
      mode: "payment",
      customer: "cus_123",
      line_items: [{ price: "price_slot", quantity: 1 }],
      metadata,
      payment_intent_data: {
        description: "Location slot for Tacos El Guero",
        metadata,
      },
      success_url: `http://localhost:3000/businesses/${BUSINESS_ID}/billing?slot=success`,
      cancel_url: `http://localhost:3000/businesses/${BUSINESS_ID}/billing?slot=cancelled`,
    });
  });
});
