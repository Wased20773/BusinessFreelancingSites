/**
 * @jest-environment node
 */

import { NextResponse } from "next/server";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";

import { PATCH, DELETE } from "@/app/api/admin/api-keys/[apiKeyId]/route";

import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const mockedAuthenticateBusinessAccess = jest.mocked(
  authenticateBusinessAccess,
);

describe("PATCH /api/admin/api-keys/[apiKeyId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authentication error response", async () => {
    const deniedResponse = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );

    mockedAuthenticateBusinessAccess.mockResolvedValue(deniedResponse);

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys/api-key-123",
      method: "PATCH",
      body: {
        name: "Renamed Key",
      },
    });

    const response = await PATCH(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.businessApiKey.findFirst).not.toHaveBeenCalled();
  });

  it.each([null, 123, true, "", "   "])(
    "returns 400 for invalid name: %p",
    async (name) => {
      mockSuccessfulAuthentication();

      const request = createJsonRequest({
        url: "http://localhost/api/admin/api-keys/api-key-123",
        method: "PATCH",
        body: {
          name,
        },
      });

      const response = await PATCH(
        request,
        createRouteContext({
          apiKeyId: "api-key-123",
        }),
      );

      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: "API key name must be a non-empty string",
      });
    },
  );

  it.each([null, "true", 1, {}])(
    "returns 400 for invalid isActive: %p",
    async (isActive) => {
      mockSuccessfulAuthentication();

      const request = createJsonRequest({
        url: "http://localhost/api/admin/api-keys/api-key-123",
        method: "PATCH",
        body: {
          isActive,
        },
      });

      const response = await PATCH(
        request,
        createRouteContext({
          apiKeyId: "api-key-123",
        }),
      );

      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: "isActive must be a boolean",
      });
    },
  );

  it("returns 400 when no supported update field is provided", async () => {
    mockSuccessfulAuthentication();

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys/api-key-123",
      method: "PATCH",
      body: {
        unsupported: "value",
      },
    });

    const response = await PATCH(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "Provide a name or isActive value to update",
    });
  });

  it("returns 404 when the API key does not belong to the current business", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue(null);

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys/other-key",
      method: "PATCH",
      body: {
        name: "Renamed Key",
      },
    });

    const response = await PATCH(
      request,
      createRouteContext({
        apiKeyId: "other-key",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "API key not found",
    });

    expect(mockPrisma.businessApiKey.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-key",
        businessId: "business-123",
      },
      select: {
        id: true,
      },
    });

    expect(mockPrisma.businessApiKey.update).not.toHaveBeenCalled();
  });

  it("renames and deactivates the API key", async () => {
    const createdAt = new Date("2026-07-30T12:00:00.000Z");
    const updatedAt = new Date("2026-07-30T13:00:00.000Z");

    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue({
      id: "api-key-123",
    });

    mockPrisma.businessApiKey.update.mockResolvedValue({
      id: "api-key-123",
      name: "Development Website",
      keyPrefix: "bp_abc1234",
      isActive: false,
      createdAt,
      updatedAt,
    });

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys/api-key-123",
      method: "PATCH",
      body: {
        name: "  Development Website  ",
        isActive: false,
      },
    });

    const response = await PATCH(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual({
      id: "api-key-123",
      name: "Development Website",
      keyPrefix: "bp_abc1234",
      isActive: false,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });

    expect(mockPrisma.businessApiKey.update).toHaveBeenCalledWith({
      where: {
        id: "api-key-123",
      },
      data: {
        name: "Development Website",
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("returns 500 when updating the API key fails", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue({
      id: "api-key-123",
    });

    mockPrisma.businessApiKey.update.mockRejectedValue(
      new Error("Update failed"),
    );

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys/api-key-123",
      method: "PATCH",
      body: {
        name: "Renamed Key",
      },
    });

    const response = await PATCH(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Failed to update business API key",
    });
  });
});

describe("DELETE /api/admin/api-keys/[apiKeyId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authentication error response", async () => {
    const deniedResponse = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );

    mockedAuthenticateBusinessAccess.mockResolvedValue(deniedResponse);

    const request = new Request(
      "http://localhost/api/admin/api-keys/api-key-123",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.businessApiKey.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the key does not belong to the current business", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/api-keys/other-key",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(
      request,
      createRouteContext({
        apiKeyId: "other-key",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: "API key not found",
    });

    expect(mockPrisma.businessApiKey.delete).not.toHaveBeenCalled();
  });

  it("deletes an API key belonging to the current business", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue({
      id: "api-key-123",
    });

    mockPrisma.businessApiKey.delete.mockResolvedValue({
      id: "api-key-123",
    });

    const request = new Request(
      "http://localhost/api/admin/api-keys/api-key-123",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual({
      message: "API key deleted successfully",
    });

    expect(mockPrisma.businessApiKey.delete).toHaveBeenCalledWith({
      where: {
        id: "api-key-123",
      },
    });
  });

  it("returns 500 when deleting the API key fails", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findFirst.mockResolvedValue({
      id: "api-key-123",
    });

    mockPrisma.businessApiKey.delete.mockRejectedValue(
      new Error("Delete failed"),
    );

    const request = new Request(
      "http://localhost/api/admin/api-keys/api-key-123",
      {
        method: "DELETE",
      },
    );

    const response = await DELETE(
      request,
      createRouteContext({
        apiKeyId: "api-key-123",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Failed to delete business API key",
    });
  });
});
