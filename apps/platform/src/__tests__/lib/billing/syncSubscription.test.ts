/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getStripe, getTierForPriceId } from "@/lib/billing/stripe";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
  getTierForPriceId: jest.fn(),
}));

import { syncSubscription } from "@/lib/billing/syncSubscription";

const mockRetrieve = jest.fn();
const mockCancel = jest.fn();

const PERIOD_END = 1_800_000_000; // seconds, as Stripe sends it

function stripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_new",
    status: "active",
    metadata: { businessId: "business-123", payerId: "user-123" },
    items: {
      data: [
        { price: { id: "price_family" }, current_period_end: PERIOD_END },
      ],
    },
    cancel_at_period_end: false,
    cancel_at: null,
    ...overrides,
  };
}

const savedFields = {
  stripeSubscriptionId: "sub_new",
  payerId: "user-123",
  tier: "familyBusiness",
  status: "active",
  currentPeriodEnd: new Date(PERIOD_END * 1000),
  cancelAtPeriodEnd: false,
};

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getStripe).mockReturnValue({
    subscriptions: { retrieve: mockRetrieve, cancel: mockCancel },
  } as never);
  jest.mocked(getTierForPriceId).mockReturnValue("familyBusiness");
});

describe("syncSubscription", () => {
  it("creates the row for a business's first subscription", async () => {
    mockRetrieve.mockResolvedValue(stripeSubscription());
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.business.findUnique.mockResolvedValue({ id: "business-123" });

    await syncSubscription("sub_new");

    expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
      data: { businessId: "business-123", ...savedFields },
    });
  });

  it("updates the row when the business's current subscription changes", async () => {
    mockRetrieve.mockResolvedValue(
      stripeSubscription({ status: "past_due", cancel_at: PERIOD_END }),
    );
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_new",
    });

    await syncSubscription("sub_new");

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { businessId: "business-123" },
      data: { ...savedFields, status: "past_due", cancelAtPeriodEnd: true },
    });
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("takes over: cancels the old payer's subscription with no proration and replaces the row", async () => {
    mockRetrieve
      .mockResolvedValueOnce(stripeSubscription()) // the new subscription
      .mockResolvedValueOnce({ id: "sub_old", status: "active" }); // the old one
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_old",
    });

    await syncSubscription("sub_new");

    expect(mockCancel).toHaveBeenCalledWith("sub_old", { prorate: false });
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { businessId: "business-123" },
      data: savedFields,
    });
  });

  it("does not take over until the new subscription is paid", async () => {
    mockRetrieve.mockResolvedValue(stripeSubscription({ status: "incomplete" }));
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_old",
    });

    await syncSubscription("sub_new");

    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("ignores a subscription that wasn't created by our Checkout", async () => {
    mockRetrieve.mockResolvedValue(stripeSubscription({ metadata: {} }));

    await syncSubscription("sub_new");

    expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
  });
});
