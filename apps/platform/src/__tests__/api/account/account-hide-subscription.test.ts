/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/account/billing/subscriptions/[businessId]/hide/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

function hide(businessId = "business-1") {
  return POST(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ businessId }),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("POST /api/account/billing/subscriptions/[businessId]/hide", () => {
  it("returns 401 when the user is not logged in", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await hide();

    expect(response.status).toBe(401);
  });

  it("returns 404 when the user doesn't pay for the business", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.subscription.findUnique.mockResolvedValue({
      payerId: "someone-else",
      business: { users: [] },
    });

    const response = await hide();

    expect(response.status).toBe(404);
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the business has no subscription", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    const response = await hide();

    expect(response.status).toBe(404);
  });

  it("returns 409 while the payer is still in the business", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.subscription.findUnique.mockResolvedValue({
      payerId: "user-123",
      business: { users: [{ id: "member-1" }] },
    });

    const response = await hide();

    expect(response.status).toBe(409);
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it("hides the plan of a business the payer was removed from", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.subscription.findUnique.mockResolvedValue({
      payerId: "user-123",
      business: { users: [] },
    });

    const response = await hide();

    expect(response.status).toBe(200);
    expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { businessId: "business-1" } }),
    );
    // Only hidden; nothing about the plan itself changes.
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { businessId: "business-1" },
      data: { hiddenByPayer: true },
    });
  });

  it("returns 500 when the database fails", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.subscription.findUnique.mockRejectedValue(new Error("DB down"));

    const response = await hide();

    expect(response.status).toBe(500);
  });
});
