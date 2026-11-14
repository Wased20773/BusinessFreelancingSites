/**
 * @jest-environment node
 */
import { auth } from "@/auth";
import { getStripe } from "@/lib/billing/stripe";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
  getPriceIdForTier: (tier: string) => `price_${tier}`,
  getLocationSlotPriceId: () => "price_slot",
}));

import { GET } from "@/app/api/billing/prices/route";

const AMOUNTS_IN_CENTS: Record<string, number> = {
  price_familyBusiness: 1200,
  price_localBusiness: 3500,
  price_growingBusiness: 9000,
  price_slot: 3000,
};

const mockRetrieve = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();

  mockRetrieve.mockImplementation(async (priceId: string) => ({
    unit_amount: AMOUNTS_IN_CENTS[priceId],
    currency: "usd",
  }));
  jest.mocked(getStripe).mockReturnValue({
    prices: { retrieve: mockRetrieve },
  } as never);
});

describe("GET /api/billing/prices", () => {
  it("returns 401 when the user is not logged in", async () => {
    jest.mocked(auth).mockResolvedValue(null as never);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("returns each tier's and the slot's price in dollars", async () => {
    jest.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tiers: {
        familyBusiness: { amount: 12, currency: "usd" },
        localBusiness: { amount: 35, currency: "usd" },
        growingBusiness: { amount: 90, currency: "usd" },
      },
      locationSlot: { amount: 30, currency: "usd" },
    });
  });
});
