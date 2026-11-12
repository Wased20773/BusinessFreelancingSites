/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// A fake Stripe SDK: the tests never call Stripe.
const mockCustomersCreate = jest.fn();

jest.mock("stripe", () => ({
  __esModule: true,
  default: class {
    customers = { create: mockCustomersCreate };
  },
}));

import {
  getOrCreateStripeCustomer,
  getTierForPriceId,
} from "@/lib/billing/stripe";

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();

  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_PRICE_FAMILY_BUSINESS = "price_family";
  process.env.STRIPE_PRICE_LOCAL_BUSINESS = "price_local";
  process.env.STRIPE_PRICE_GROWING_BUSINESS = "price_growing";
});

describe("getTierForPriceId", () => {
  it.each([
    ["price_family", "familyBusiness"],
    ["price_local", "localBusiness"],
    ["price_growing", "growingBusiness"],
  ])("maps %s to %s", (priceId, tier) => {
    expect(getTierForPriceId(priceId)).toBe(tier);
  });

  it("returns null for a price that isn't one of ours", () => {
    expect(getTierForPriceId("price_unknown")).toBeNull();
  });
});

describe("getOrCreateStripeCustomer", () => {
  it("reuses the user's existing Stripe customer", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      email: "bryan@example.com",
      name: "Bryan",
    });

    expect(await getOrCreateStripeCustomer("user-123")).toBe("cus_existing");
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("creates and saves a customer the first time the user pays", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeCustomerId: null,
      email: "bryan@example.com",
      name: "Bryan",
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });

    expect(await getOrCreateStripeCustomer("user-123")).toBe("cus_new");

    expect(mockCustomersCreate).toHaveBeenCalledWith(
      {
        email: "bryan@example.com",
        name: "Bryan",
        metadata: { userId: "user-123" },
      },
      { idempotencyKey: "customer-for-user-user-123" },
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { stripeCustomerId: "cus_new" },
    });
  });
});
