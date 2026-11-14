/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/syncSubscription";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
}));

jest.mock("@/lib/billing/syncSubscription", () => ({
  syncSubscription: jest.fn(),
}));

// jest.setup mocks this module for route tests; test the real one here.
jest.mock("@/lib/billing/cancelSubscription", () =>
  jest.requireActual("@/lib/billing/cancelSubscription"),
);

import {
  cancelSubscriptionForDeletedBusiness,
  cancelSubscriptionForDepartingPayer,
} from "@/lib/billing/cancelSubscription";

const mockRetrieve = jest.fn();
const mockCancel = jest.fn();
const mockUpdate = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  jest.mocked(getStripe).mockReturnValue({
    subscriptions: {
      retrieve: mockRetrieve,
      cancel: mockCancel,
      update: mockUpdate,
    },
  } as never);
});

describe("cancelSubscriptionForDeletedBusiness", () => {
  it("does nothing when the business never subscribed", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await cancelSubscriptionForDeletedBusiness("business-123");

    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("cancels the subscription right away", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_123",
    });
    mockRetrieve.mockResolvedValue({ id: "sub_123", status: "active" });

    await cancelSubscriptionForDeletedBusiness("business-123");

    expect(mockCancel).toHaveBeenCalledWith("sub_123");
  });

  it("skips Stripe's cancel when the subscription is already canceled", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_123",
    });
    mockRetrieve.mockResolvedValue({ id: "sub_123", status: "canceled" });

    await cancelSubscriptionForDeletedBusiness("business-123");

    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("throws when Stripe fails, so the business is not deleted", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_123",
    });
    mockRetrieve.mockRejectedValue(new Error("Stripe is down"));

    await expect(
      cancelSubscriptionForDeletedBusiness("business-123"),
    ).rejects.toThrow("Stripe is down");
  });
});

describe("cancelSubscriptionForDepartingPayer", () => {
  const paidSubscription = {
    payerId: "user-123",
    stripeSubscriptionId: "sub_123",
    status: "active",
    cancelAtPeriodEnd: false,
  };

  it("stops the payer's subscription at the end of the paid month", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(paidSubscription);

    await cancelSubscriptionForDepartingPayer("business-123", "user-123");

    expect(mockUpdate).toHaveBeenCalledWith("sub_123", {
      cancel_at_period_end: true,
    });
    expect(syncSubscription).toHaveBeenCalledWith("sub_123");
  });

  it.each([
    ["the business never subscribed", null],
    [
      "the user is not the payer",
      { ...paidSubscription, payerId: "someone-else" },
    ],
    ["the subscription already ended", { ...paidSubscription, status: "canceled" }],
    [
      "it is already set to cancel",
      { ...paidSubscription, cancelAtPeriodEnd: true },
    ],
  ])("does nothing when %s", async (_case, subscription) => {
    mockPrisma.subscription.findUnique.mockResolvedValue(subscription);

    await cancelSubscriptionForDepartingPayer("business-123", "user-123");

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(syncSubscription).not.toHaveBeenCalled();
  });
});
