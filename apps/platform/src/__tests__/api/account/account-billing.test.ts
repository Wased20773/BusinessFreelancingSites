/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getStripe } from "@/lib/billing/stripe";

import { GET } from "@/app/api/account/billing/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
}));

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

const PERIOD_END = new Date("2026-12-12T00:00:00.000Z");

// Stripe timestamps are in seconds.
const NOV_1 = Date.UTC(2026, 10, 1) / 1000;
const NOV_5 = Date.UTC(2026, 10, 5) / 1000;
const NOV_9 = Date.UTC(2026, 10, 9) / 1000;

const mockListInvoices = jest.fn();
const mockListPaymentIntents = jest.fn();

// Stripe list calls return an object with autoPagingToArray().
function stripeList(records: unknown[]) {
  return { autoPagingToArray: jest.fn().mockResolvedValue(records) };
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getStripe).mockReturnValue({
    invoices: { list: mockListInvoices },
    paymentIntents: { list: mockListPaymentIntents },
  } as never);
});

describe("GET /api/account/billing", () => {
  it("returns 401 when the user is not logged in", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 404 when the user does not exist", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("returns empty history without calling Stripe for someone who never paid", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      subscriptions: [],
      payments: [],
      totals: [],
    });
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("returns the user's subscriptions, every payment newest first, and the total", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        businessId: "business-1",
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        business: { name: "Tacos El Guero" },
      },
    ]);

    mockListInvoices.mockReturnValue(
      stripeList([
        {
          id: "in_1",
          billing_reason: "subscription_create",
          amount_paid: 1200,
          currency: "usd",
          created: NOV_1,
          status_transitions: { paid_at: NOV_1 },
          hosted_invoice_url: "https://invoice.stripe.com/in_1",
          parent: {
            subscription_details: { metadata: { businessId: "business-1" } },
          },
        },
        {
          id: "in_2",
          billing_reason: "subscription_update",
          amount_paid: 7794,
          currency: "usd",
          created: NOV_9,
          status_transitions: { paid_at: NOV_9 },
          hosted_invoice_url: null,
          parent: {
            subscription_details: { metadata: { businessId: "deleted-business" } },
          },
        },
      ]),
    );
    mockListPaymentIntents.mockReturnValue(
      stripeList([
        {
          id: "pi_slot",
          status: "succeeded",
          metadata: { kind: "location_slot", businessId: "business-1" },
          amount_received: 3000,
          currency: "usd",
          created: NOV_5,
          latest_charge: { receipt_url: "https://pay.stripe.com/receipts/1" },
        },
        // A subscription invoice's payment: already counted through invoices.
        {
          id: "pi_invoice",
          status: "succeeded",
          metadata: {},
          amount_received: 1200,
          currency: "usd",
          created: NOV_1,
          latest_charge: null,
        },
        // Never completed: not a payment.
        {
          id: "pi_abandoned",
          status: "requires_payment_method",
          metadata: { kind: "location_slot", businessId: "business-1" },
          amount_received: 0,
          currency: "usd",
          created: NOV_5,
          latest_charge: null,
        },
      ]),
    );
    mockPrisma.business.findMany.mockResolvedValue([
      { id: "business-1", name: "Tacos El Guero" },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.subscriptions).toEqual([
      {
        businessId: "business-1",
        businessName: "Tacos El Guero",
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END.toISOString(),
        cancelAtPeriodEnd: false,
      },
    ]);

    expect(body.payments).toEqual([
      {
        id: "in_2",
        kind: "subscription",
        businessId: "deleted-business",
        businessName: null,
        description: "Plan change",
        amount: 77.94,
        currency: "usd",
        paidAt: new Date(NOV_9 * 1000).toISOString(),
        receiptUrl: null,
      },
      {
        id: "pi_slot",
        kind: "location_slot",
        businessId: "business-1",
        businessName: "Tacos El Guero",
        description: "Location slot",
        amount: 30,
        currency: "usd",
        paidAt: new Date(NOV_5 * 1000).toISOString(),
        receiptUrl: "https://pay.stripe.com/receipts/1",
      },
      {
        id: "in_1",
        kind: "subscription",
        businessId: "business-1",
        businessName: "Tacos El Guero",
        description: "New subscription",
        amount: 12,
        currency: "usd",
        paidAt: new Date(NOV_1 * 1000).toISOString(),
        receiptUrl: "https://invoice.stripe.com/in_1",
      },
    ]);

    expect(body.totals).toEqual([{ currency: "usd", amount: 119.94 }]);

    // Only this user's Stripe customer, and only paid invoices.
    expect(mockListInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123", status: "paid" }),
    );
    expect(mockListPaymentIntents).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" }),
    );
  });

  it("only lists subscriptions this user pays for that are still paid", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: null });
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await GET();

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          payerId: "user-123",
          status: { in: ["active", "trialing", "past_due"] },
        },
      }),
    );
  });

  it("returns 500 when Stripe fails", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockListInvoices.mockReturnValue({
      autoPagingToArray: jest.fn().mockRejectedValue(new Error("Stripe is down")),
    });
    mockListPaymentIntents.mockReturnValue(stripeList([]));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
