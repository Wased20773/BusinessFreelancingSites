/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { getPayerLeftNotice } from "@/lib/billing/payerLeftNotice";

const PERIOD_END = new Date("2026-12-12T00:00:00.000Z");

const payerLeftSubscription = {
  status: "active",
  cancelAtPeriodEnd: true,
  currentPeriodEnd: PERIOD_END,
  payer: { name: "Bryan", email: "bryan@example.com", businesses: [] },
};

function mockViewer(accessLevel: string | null) {
  mockPrisma.businessUser.findUnique.mockResolvedValue(
    accessLevel ? { role: { accessLevel } } : null,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("getPayerLeftNotice", () => {
  it("tells an owner the payer left and when the plan ends", async () => {
    mockViewer("owner");
    mockPrisma.subscription.findUnique.mockResolvedValue(payerLeftSubscription);

    await expect(getPayerLeftNotice("business-123", "owner-1")).resolves.toEqual(
      { payerName: "Bryan", endsAt: PERIOD_END.toISOString() },
    );
  });

  it("falls back to the payer's email when they have no name", async () => {
    mockViewer("owner");
    mockPrisma.subscription.findUnique.mockResolvedValue({
      ...payerLeftSubscription,
      payer: { ...payerLeftSubscription.payer, name: null },
    });

    const notice = await getPayerLeftNotice("business-123", "owner-1");

    expect(notice?.payerName).toBe("bryan@example.com");
  });

  it.each([
    ["the viewer is not an owner", "admin", payerLeftSubscription],
    ["the viewer is not a member", null, payerLeftSubscription],
    ["there is no subscription", "owner", null],
    [
      "the payer is still a member",
      "owner",
      {
        ...payerLeftSubscription,
        payer: { ...payerLeftSubscription.payer, businesses: [{ id: "bu-1" }] },
      },
    ],
    [
      "the plan is not set to end",
      "owner",
      { ...payerLeftSubscription, cancelAtPeriodEnd: false },
    ],
    [
      "the plan already ended",
      "owner",
      { ...payerLeftSubscription, status: "canceled" },
    ],
  ])("returns null when %s", async (_case, accessLevel, subscription) => {
    mockViewer(accessLevel);
    mockPrisma.subscription.findUnique.mockResolvedValue(subscription);

    await expect(
      getPayerLeftNotice("business-123", "owner-1"),
    ).resolves.toBeNull();
  });
});
