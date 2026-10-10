/**
 * @jest-environment node
 */

import type { Session } from "next-auth";
import { AccessLevel } from "@business-freelancer/database";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const request = new Request("http://localhost/api/businesses/business-123");

const session: Session = {
  user: {
    id: "user-123",
    name: "Tester",
    email: "tester@example.com",
  },
  expires: "2099-01-01T00:00:00.000Z",
};

async function expectErrorResponse(
  result: unknown,
  status: number,
  body: unknown,
): Promise<void> {
  expect(result).toBeInstanceOf(Response);

  if (!(result instanceof Response)) {
    throw new Error("Expected a Response");
  }

  expect(result.status).toBe(status);
  expect(await result.json()).toEqual(body);
}

describe("authenticateBusinessAccess", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 401 when no authenticated session exists", async () => {
    mockedAuth.mockResolvedValue(null);

    const result = await authenticateBusinessAccess(request, "business-123", [
      AccessLevel.owner,
    ]);

    await expectErrorResponse(result, 401, { error: "Unauthorized Access" });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the authenticated session has no user id", async () => {
    mockedAuth.mockResolvedValue({
      ...session,
      user: { name: "Tester", email: "tester@example.com" },
    } as Session);

    const result = await authenticateBusinessAccess(request, "business-123", [
      AccessLevel.owner,
    ]);

    await expectErrorResponse(result, 401, { error: "Unauthorized Access" });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 when no businessId is provided", async () => {
    mockedAuth.mockResolvedValue(session);

    const result = await authenticateBusinessAccess(request, "", [
      AccessLevel.owner,
    ]);

    await expectErrorResponse(result, 400, { error: "Missing businessId" });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when the user does not have access to the selected business", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.businessUser.findFirst.mockResolvedValue(null);

    const result = await authenticateBusinessAccess(request, "business-123", [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    await expectErrorResponse(result, 403, { error: "Forbidden" });

    expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-123",
        businessId: "business-123",
        role: {
          accessLevel: {
            in: [AccessLevel.owner, AccessLevel.admin],
          },
        },
      },
      select: {
        userId: true,
        businessId: true,
        role: {
          select: {
            id: true,
            accessLevel: true,
          },
        },
      },
    });
  });

  it("returns 500 when the business access lookup fails", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.businessUser.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const result = await authenticateBusinessAccess(request, "business-123", [
      AccessLevel.owner,
    ]);

    await expectErrorResponse(result, 500, { error: "Failed to authenticate" });
  });

  it("returns the authenticated user, business, and access level when access is allowed", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.businessUser.findFirst.mockResolvedValue({
      userId: "user-123",
      businessId: "business-123",
      role: {
        id: "role-admin",
        accessLevel: AccessLevel.admin,
      },
    });

    const result = await authenticateBusinessAccess(request, "business-123", [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    expect(result).not.toBeInstanceOf(Response);

    expect(result).toEqual({
      userId: "user-123",
      businessId: "business-123",
      accessLevel: AccessLevel.admin,
    });
  });
});
