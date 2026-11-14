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
const NOV_3 = Date.UTC(2026, 10, 3) / 1000;
const NOV_5 = Date.UTC(2026, 10, 5) / 1000;
const NOV_7 = Date.UTC(2026, 10, 7) / 1000;
const NOV_9 = Date.UTC(2026, 10, 9) / 1000;

const mockListInvoices = jest.fn();
const mockListPaymentIntents = jest.fn();
const mockRetrieveCustomer = jest.fn();
const mockListPaymentMethods = jest.fn();
const mockListSubscriptions = jest.fn();

// Stripe list calls return an object with autoPagingToArray().
function stripeList(records: unknown[]) {
  return { autoPagingToArray: jest.fn().mockResolvedValue(records) };
}

function invoice(
  id: string,
  billingReason: string,
  total: number,
  amountPaid: number,
  paidAt: number,
  businessId: string,
) {
  return {
    id,
    billing_reason: billingReason,
    total,
    amount_paid: amountPaid,
    currency: "usd",
    created: paidAt,
    status_transitions: { paid_at: paidAt },
    hosted_invoice_url: `https://invoice.stripe.com/${id}`,
    parent: { subscription_details: { metadata: { businessId } } },
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getStripe).mockReturnValue({
    invoices: { list: mockListInvoices },
    paymentIntents: { list: mockListPaymentIntents },
    customers: {
      retrieve: mockRetrieveCustomer,
      listPaymentMethods: mockListPaymentMethods,
    },
    subscriptions: { list: mockListSubscriptions },
  } as never);

  mockRetrieveCustomer.mockResolvedValue({
    balance: 0,
    currency: "usd",
    invoice_settings: { default_payment_method: null },
  });
  mockListPaymentMethods.mockReturnValue(stripeList([]));
  mockListSubscriptions.mockReturnValue(stripeList([]));
});

// The fingerprint is the same for the same physical card.
function card(id: string, brand: string, last4: string, fingerprint = id) {
  return {
    id,
    type: "card",
    card: { brand, last4, fingerprint, exp_month: 4, exp_year: 2029 },
  };
}

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
      credit: null,
      paymentMethods: [],
    });
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("shows what each payment cost, what credit covered, and only card charges in the total", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        businessId: "business-1",
        tier: "growingBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        business: { name: "Tacos El Guero", users: [{ id: "member-1" }] },
      },
    ]);

    /*
     * Buy Growing ($90), downgrade (leaves $77.98 credit), new Family
     * paid fully from credit, then an upgrade that credit only partly covers.
     */
    mockListInvoices.mockReturnValue(
      stripeList([
        invoice("in_upgrade", "subscription_update", 5500, 1202, NOV_9, "deleted-business"),
        invoice("in_family", "subscription_create", 1200, 0, NOV_5, "business-1"),
        invoice("in_downgrade", "subscription_update", -7798, 0, NOV_3, "business-1"),
        invoice("in_growing", "subscription_create", 9000, 9000, NOV_1, "business-1"),
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
          created: NOV_7,
          latest_charge: { receipt_url: "https://pay.stripe.com/receipts/1" },
        },
        // A subscription invoice's payment: already counted through invoices.
        {
          id: "pi_invoice",
          status: "succeeded",
          metadata: {},
          amount_received: 9000,
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
    // Stripe stores credit as a negative balance.
    mockRetrieveCustomer.mockResolvedValue({
      balance: -500,
      currency: "usd",
      invoice_settings: { default_payment_method: null },
    });
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
        tier: "growingBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END.toISOString(),
        cancelAtPeriodEnd: false,
        paymentMethodId: null,
        isMember: true,
      },
    ]);

    expect(
      body.payments.map(
        (payment: { id: string; kind: string; businessName: string | null; description: string; amount: number; paidFromCredit: number }) => ({
          id: payment.id,
          kind: payment.kind,
          businessName: payment.businessName,
          description: payment.description,
          amount: payment.amount,
          paidFromCredit: payment.paidFromCredit,
        }),
      ),
    ).toEqual([
      { id: "in_upgrade", kind: "subscription", businessName: null, description: "Plan change", amount: 55, paidFromCredit: 42.98 },
      { id: "pi_slot", kind: "location_slot", businessName: "Tacos El Guero", description: "Location slot", amount: 30, paidFromCredit: 0 },
      { id: "in_family", kind: "subscription", businessName: "Tacos El Guero", description: "New subscription", amount: 12, paidFromCredit: 12 },
      { id: "in_downgrade", kind: "credit", businessName: "Tacos El Guero", description: "Credit added", amount: -77.98, paidFromCredit: 0 },
      { id: "in_growing", kind: "subscription", businessName: "Tacos El Guero", description: "New subscription", amount: 90, paidFromCredit: 0 },
    ]);

    expect(body.payments[1]).toMatchObject({
      paidAt: new Date(NOV_7 * 1000).toISOString(),
      receiptUrl: "https://pay.stripe.com/receipts/1",
    });

    // Card charges only: $90 + $12.02 + $30 slot.
    expect(body.totals).toEqual([{ currency: "usd", amount: 132.02 }]);
    expect(body.credit).toEqual({ currency: "usd", amount: 5 });

    // Only this user's Stripe customer, and only paid invoices.
    expect(mockListInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123", status: "paid" }),
    );
    expect(mockListPaymentIntents).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" }),
    );
    expect(mockRetrieveCustomer).toHaveBeenCalledWith("cus_123");
  });

  it("lists saved cards with the businesses each one pays for", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        businessId: "business-1",
        tier: "growingBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        business: { name: "Tacos El Guero", users: [{ id: "member-1" }] },
      },
      {
        businessId: "business-2",
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        business: { name: "Panaderia Luz", users: [{ id: "member-2" }] },
      },
      {
        businessId: "business-3",
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: true,
        // The user was removed from this business while paying for it.
        business: { name: "Old Payer Cafe", users: [] },
      },
    ]);
    mockListInvoices.mockReturnValue(stripeList([]));
    mockListPaymentIntents.mockReturnValue(stripeList([]));
    mockRetrieveCustomer.mockResolvedValue({
      balance: 0,
      currency: "usd",
      invoice_settings: { default_payment_method: "pm_master" },
    });
    mockListPaymentMethods.mockReturnValue(
      stripeList([
        // The same Visa saved twice: shown once, as the copy a plan bills.
        card("pm_visa_copy", "visa", "4242", "fp_visa"),
        card("pm_visa", "visa", "4242", "fp_visa"),
        card("pm_master", "mastercard", "4444"),
        // Paid with Stripe Link instead of a typed card.
        { id: "pm_link", type: "link", link: { email: "tester@example.com" } },
        { id: "pm_bank", type: "us_bank_account" },
      ]),
    );
    mockListSubscriptions.mockReturnValue(
      stripeList([
        // Checkout saved the card on the subscription.
        {
          status: "active",
          metadata: { businessId: "business-1" },
          default_payment_method: "pm_visa",
        },
        // No card on the subscription: the customer's default pays.
        {
          status: "active",
          metadata: { businessId: "business-2" },
          default_payment_method: null,
        },
        // Set to end: still billed to the card, but never renews.
        {
          status: "active",
          cancel_at_period_end: true,
          metadata: { businessId: "business-3" },
          default_payment_method: "pm_link",
        },
        // An ended plan no longer counts.
        {
          status: "canceled",
          metadata: { businessId: "old-business" },
          default_payment_method: "pm_link",
        },
      ]),
    );

    const response = await GET();
    const body = await response.json();

    expect(body.paymentMethods).toEqual([
      {
        id: "pm_visa",
        type: "card",
        label: "Visa •••• 4242",
        expires: "04/29",
        usedBy: ["Tacos El Guero"],
      },
      {
        id: "pm_master",
        type: "card",
        label: "Mastercard •••• 4444",
        expires: "04/29",
        usedBy: ["Panaderia Luz"],
      },
      {
        id: "pm_link",
        type: "link",
        label: "Link (tester@example.com)",
        expires: null,
        // Old Payer Cafe's plan is ending, so it's free to remove.
        usedBy: [],
      },
      {
        id: "pm_bank",
        type: "us_bank_account",
        label: "Us bank account",
        expires: null,
        usedBy: [],
      },
    ]);

    // Each plan points at the card it bills, so the picker selects it.
    expect(
      body.subscriptions.map(
        (subscription: { businessId: string; paymentMethodId: string }) => [
          subscription.businessId,
          subscription.paymentMethodId,
        ],
      ),
    ).toEqual([
      ["business-1", "pm_visa"],
      ["business-2", "pm_master"],
      ["business-3", "pm_link"],
    ]);

    // Removed from Old Payer Cafe: the page hides its Manage button.
    expect(
      body.subscriptions.map(
        (subscription: { businessId: string; isMember: boolean }) => [
          subscription.businessId,
          subscription.isMember,
        ],
      ),
    ).toEqual([
      ["business-1", true],
      ["business-2", true],
      ["business-3", false],
    ]);
    // Every type, not only cards.
    expect(mockListPaymentMethods).toHaveBeenCalledWith("cus_123", {
      limit: 100,
    });
    expect(mockListSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_123" }),
    );
  });

  it("has no credit when the customer balance is zero or owed", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_123" });
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockListInvoices.mockReturnValue(stripeList([]));
    mockListPaymentIntents.mockReturnValue(stripeList([]));
    mockRetrieveCustomer.mockResolvedValue({
      balance: 250,
      currency: "usd",
      invoice_settings: { default_payment_method: null },
    });

    const response = await GET();

    expect((await response.json()).credit).toBeNull();
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
          // Hidden plans stay out, unless they were added back to the business.
          OR: [
            { hiddenByPayer: false },
            { business: { users: { some: { userId: "user-123" } } } },
          ],
        },
        // Membership is checked for this user only.
        select: expect.objectContaining({
          business: {
            select: {
              name: true,
              users: { where: { userId: "user-123" }, select: { id: true } },
            },
          },
        }),
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
