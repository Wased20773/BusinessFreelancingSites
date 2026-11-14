/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import {
  getAppUrl,
  getOrCreateStripeCustomer,
  getStripe,
} from "@/lib/billing/stripe";

import { POST } from "@/app/api/account/billing/payment-methods/route";
import { DELETE } from "@/app/api/account/billing/payment-methods/[paymentMethodId]/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/billing/stripe", () => ({
  getAppUrl: jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
  getStripe: jest.fn(),
}));

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

const mockCreateCheckoutSession = jest.fn();
const mockListPaymentMethods = jest.fn();
const mockListSubscriptions = jest.fn();
const mockRetrieveCustomer = jest.fn();
const mockDetach = jest.fn();

function stripeList(records: unknown[]) {
  return { autoPagingToArray: jest.fn().mockResolvedValue(records) };
}

function card(id: string, fingerprint: string) {
  return {
    id,
    type: "card",
    card: { brand: "visa", last4: "4242", fingerprint, exp_month: 4, exp_year: 2029 },
  };
}

function removeContext(paymentMethodId: string) {
  return { params: Promise.resolve({ paymentMethodId }) };
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getAppUrl).mockReturnValue("http://localhost:3000");
  jest.mocked(getStripe).mockReturnValue({
    checkout: { sessions: { create: mockCreateCheckoutSession } },
    customers: {
      listPaymentMethods: mockListPaymentMethods,
      retrieve: mockRetrieveCustomer,
    },
    subscriptions: { list: mockListSubscriptions },
    paymentMethods: { detach: mockDetach },
  } as never);

  mockRetrieveCustomer.mockResolvedValue({
    invoice_settings: { default_payment_method: null },
  });
  mockListSubscriptions.mockReturnValue(stripeList([]));
});

describe("POST /api/account/billing/payment-methods", () => {
  it("returns 401 when the user is not logged in", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it("opens a Stripe page that only saves a card, then returns to Settings → Billing", async () => {
    mockedAuth.mockResolvedValue(session);
    jest.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
    mockCreateCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.com/c/1",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/c/1",
    });
    expect(getOrCreateStripeCustomer).toHaveBeenCalledWith("user-123");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      mode: "setup",
      customer: "cus_123",
      allowed_payment_method_types: ["card"],
      success_url: "http://localhost:3000/settings/account/billing?card=added",
      cancel_url: "http://localhost:3000/settings/account/billing?card=cancelled",
    });
  });

  it("returns 500 when Stripe fails", async () => {
    mockedAuth.mockResolvedValue(session);
    jest.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_123");
    mockCreateCheckoutSession.mockRejectedValue(new Error("Stripe is down"));

    const response = await POST();

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/account/billing/payment-methods/[paymentMethodId]", () => {
  function signedInWithCards(cards: unknown[]) {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockListPaymentMethods.mockReturnValue(stripeList(cards));
  }

  it("returns 401 when the user is not logged in", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), removeContext("pm_1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 for a payment method the user doesn't have", async () => {
    signedInWithCards([card("pm_mine", "fp_1")]);

    const response = await DELETE(
      new Request("http://localhost"),
      removeContext("pm_someone_else"),
    );

    expect(response.status).toBe(404);
    expect(mockDetach).not.toHaveBeenCalled();
  });

  it("removes the card and every saved copy of it", async () => {
    signedInWithCards([
      card("pm_visa", "fp_visa"),
      card("pm_visa_copy", "fp_visa"),
      card("pm_master", "fp_master"),
    ]);

    const response = await DELETE(new Request("http://localhost"), removeContext("pm_visa"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: 2 });
    expect(mockDetach).toHaveBeenCalledTimes(2);
    expect(mockDetach).toHaveBeenCalledWith("pm_visa");
    expect(mockDetach).toHaveBeenCalledWith("pm_visa_copy");
  });

  it("returns 409 when a copy of the card pays for a plan", async () => {
    signedInWithCards([card("pm_visa", "fp_visa"), card("pm_visa_copy", "fp_visa")]);
    mockListSubscriptions.mockReturnValue(
      stripeList([{ status: "active", default_payment_method: "pm_visa_copy" }]),
    );

    const response = await DELETE(new Request("http://localhost"), removeContext("pm_visa"));

    expect(response.status).toBe(409);
    expect(mockDetach).not.toHaveBeenCalled();
  });

  it("returns 409 when a plan falls back to it as the default card", async () => {
    signedInWithCards([card("pm_visa", "fp_visa")]);
    mockRetrieveCustomer.mockResolvedValue({
      invoice_settings: { default_payment_method: "pm_visa" },
    });
    mockListSubscriptions.mockReturnValue(
      stripeList([{ status: "past_due", default_payment_method: null }]),
    );

    const response = await DELETE(new Request("http://localhost"), removeContext("pm_visa"));

    expect(response.status).toBe(409);
  });

  it("allows removing the card of a plan set to end (still active until then)", async () => {
    signedInWithCards([card("pm_visa", "fp_visa"), card("pm_master", "fp_master")]);
    mockListSubscriptions.mockReturnValue(
      stripeList([
        // The payer left: active until the period ends, never renews.
        { status: "active", cancel_at_period_end: true, default_payment_method: "pm_visa" },
        // Cancelled for a set date.
        { status: "active", cancel_at: 1798761600, default_payment_method: "pm_master" },
      ]),
    );

    const removeVisa = await DELETE(new Request("http://localhost"), removeContext("pm_visa"));
    const removeMaster = await DELETE(new Request("http://localhost"), removeContext("pm_master"));

    expect(removeVisa.status).toBe(200);
    expect(removeMaster.status).toBe(200);
  });

  it("allows removing a card only an ended plan used", async () => {
    signedInWithCards([card("pm_visa", "fp_visa")]);
    mockListSubscriptions.mockReturnValue(
      stripeList([{ status: "canceled", default_payment_method: "pm_visa" }]),
    );

    const response = await DELETE(new Request("http://localhost"), removeContext("pm_visa"));

    expect(response.status).toBe(200);
    expect(mockDetach).toHaveBeenCalledWith("pm_visa");
  });
});
