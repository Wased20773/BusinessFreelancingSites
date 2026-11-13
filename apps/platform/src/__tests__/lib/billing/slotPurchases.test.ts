/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  recordSlotPurchase,
  revokeSlotPurchase,
} from "@/lib/billing/slotPurchases";

function slotSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_123",
    payment_status: "paid",
    payment_intent: "pi_123",
    metadata: {
      kind: "location_slot",
      businessId: "business-123",
      buyerId: "user-123",
    },
    ...overrides,
  } as never;
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("recordSlotPurchase", () => {
  it("records a paid slot purchase, keyed on the Checkout session", async () => {
    mockPrisma.locationSlotPurchase.upsert.mockResolvedValue({});

    await recordSlotPurchase(slotSession());

    expect(mockPrisma.locationSlotPurchase.upsert).toHaveBeenCalledWith({
      where: { stripeCheckoutSessionId: "cs_123" },
      create: {
        businessId: "business-123",
        buyerId: "user-123",
        stripeCheckoutSessionId: "cs_123",
        stripePaymentIntentId: "pi_123",
      },
      update: {},
    });
  });

  it("ignores subscription Checkouts", async () => {
    await recordSlotPurchase(
      slotSession({ metadata: { businessId: "business-123" } }),
    );

    expect(mockPrisma.locationSlotPurchase.upsert).not.toHaveBeenCalled();
  });

  it("ignores a session that hasn't been paid", async () => {
    await recordSlotPurchase(slotSession({ payment_status: "unpaid" }));

    expect(mockPrisma.locationSlotPurchase.upsert).not.toHaveBeenCalled();
  });

  it("ignores a business that was deleted after Checkout started", async () => {
    mockPrisma.locationSlotPurchase.upsert.mockRejectedValue({ code: "P2003" });

    await expect(recordSlotPurchase(slotSession())).resolves.toBeUndefined();
  });
});

describe("revokeSlotPurchase", () => {
  it("revokes the slot bought with the disputed payment", async () => {
    await revokeSlotPurchase({ payment_intent: "pi_123" } as never);

    expect(mockPrisma.locationSlotPurchase.updateMany).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: "pi_123", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
