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

describe("authenticateBusinessAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no authenticated session exists", async () => {
    mockedAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/test");

    const response = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
    ]);

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new Error("Expected a Response");
    }

    const responseBody = await response.json();

    expect(response.status).toBe(401);

    expect(responseBody).toEqual({
      error: "Unauthorized Access",
    });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the authenticated session has no email", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        name: "Tester",
        email: undefined,
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/admin/test");

    const response = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
    ]);

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new Error("Expected a Response");
    }

    const responseBody = await response.json();

    expect(response.status).toBe(401);

    expect(responseBody).toEqual({
      error: "Unauthorized Access",
    });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when the session has no businessId", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        name: "Tester",
        email: "tester@example.com",
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    const request = new Request("http://localhost/api/admin/test");

    const response = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
    ]);

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new Error("Expected a Response");
    }

    const responseBody = await response.json();

    expect(response.status).toBe(403);

    expect(responseBody).toEqual({
      error: "No business selected",
    });

    expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when the user does not have access to the selected business", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        name: "Tester",
        email: "tester@example.com",
        businessId: "business-123",
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    mockPrisma.businessUser.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/test");

    const allowedRoles = [AccessLevel.owner, AccessLevel.admin];

    const response = await authenticateBusinessAccess(request, allowedRoles);

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new Error("Expected a Response");
    }

    const responseBody = await response.json();

    expect(response.status).toBe(403);

    expect(responseBody).toEqual({
      error: "Forbidden",
    });

    expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
      where: {
        user: {
          email: "tester@example.com",
        },
        businessId: "business-123",
        role: {
          accessLevel: {
            in: allowedRoles,
          },
        },
      },
      select: {
        businessId: true,
        userId: true,
      },
    });
  });

  it("returns 400 when the business access lookup fails", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        name: "Tester",
        email: "tester@example.com",
        businessId: "business-123",
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    mockPrisma.businessUser.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const request = new Request("http://localhost/api/admin/test");

    const response = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
    ]);

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      throw new Error("Expected a Response");
    }

    const responseBody = await response.json();

    expect(response.status).toBe(400);

    expect(responseBody).toEqual({
      error: "Failed to authenticate",
    });

    expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
      where: {
        user: {
          email: "tester@example.com",
        },
        businessId: "business-123",
        role: {
          accessLevel: {
            in: [AccessLevel.owner],
          },
        },
      },
      select: {
        businessId: true,
        userId: true,
      },
    });
  });

  it("returns the authenticated user and business identifiers when access is allowed", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        name: "Tester",
        email: "tester@example.com",
        businessId: "business-123",
      },
      expires: "2099-01-01T00:00:00.000Z",
    });

    mockPrisma.businessUser.findFirst.mockResolvedValue({
      businessId: "business-123",
      userId: "user-123",
    });

    const request = new Request("http://localhost/api/admin/test");

    const allowedRoles = [AccessLevel.owner, AccessLevel.admin];

    const result = await authenticateBusinessAccess(request, allowedRoles);

    expect(result).not.toBeInstanceOf(Response);

    expect(result).toEqual({
      userId: "user-123",
      businessId: "business-123",
    });

    expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
      where: {
        user: {
          email: "tester@example.com",
        },
        businessId: "business-123",
        role: {
          accessLevel: {
            in: allowedRoles,
          },
        },
      },
      select: {
        businessId: true,
        userId: true,
      },
    });
  });
});
