/**
 * @jest-environment node
 */

import { NextResponse } from "next/server";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";

import { GET, POST } from "@/app/api/admin/api-keys/route";

import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { createBusinessApiKey } from "@/lib/api-keys/createBusinessApiKey";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/api-keys/createBusinessApiKey", () => ({
  createBusinessApiKey: jest.fn(),
}));

const mockedAuthenticateBusinessAccess = jest.mocked(
  authenticateBusinessAccess,
);

const mockedCreateBusinessApiKey = jest.mocked(createBusinessApiKey);

describe("GET /api/admin/api-keys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authentication error response", async () => {
    const deniedResponse = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );

    mockedAuthenticateBusinessAccess.mockResolvedValue(deniedResponse);

    const request = new Request("http://localhost/api/admin/api-keys");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "Forbidden",
    });

    expect(mockPrisma.businessApiKey.findMany).not.toHaveBeenCalled();
  });

  it("returns API-key metadata for the authenticated business", async () => {
    const createdAt = new Date("2026-07-30T12:00:00.000Z");
    const updatedAt = new Date("2026-07-30T13:00:00.000Z");

    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findMany.mockResolvedValue([
      {
        id: "api-key-123",
        name: "Production Website",
        keyPrefix: "bp_abc1234",
        isActive: true,
        createdAt,
        updatedAt,
      },
    ]);

    const request = new Request("http://localhost/api/admin/api-keys");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual([
      {
        id: "api-key-123",
        name: "Production Website",
        keyPrefix: "bp_abc1234",
        isActive: true,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ]);

    expect(mockPrisma.businessApiKey.findMany).toHaveBeenCalledWith({
      where: {
        businessId: "business-123",
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("returns 500 when listing API keys fails", async () => {
    mockSuccessfulAuthentication();

    mockPrisma.businessApiKey.findMany.mockRejectedValue(
      new Error("Database failure"),
    );

    const request = new Request("http://localhost/api/admin/api-keys");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Failed to retrieve business API keys",
    });
  });
});

describe("POST /api/admin/api-keys", () => {
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
      url: "http://localhost/api/admin/api-keys",
      method: "POST",
      body: {
        name: "Production Website",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedCreateBusinessApiKey).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 123, true, "", "   "])(
    "returns 400 for invalid name: %p",
    async (name) => {
      mockSuccessfulAuthentication();

      const request = createJsonRequest({
        url: "http://localhost/api/admin/api-keys",
        method: "POST",
        body: {
          name,
        },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: "API key name is required",
      });

      expect(mockedCreateBusinessApiKey).not.toHaveBeenCalled();
    },
  );

  it("creates a Business API key and returns the raw key once", async () => {
    const createdAt = new Date("2026-07-30T12:00:00.000Z");

    mockSuccessfulAuthentication();

    mockedCreateBusinessApiKey.mockResolvedValue({
      apiKey: "bp_full-secret-key",
      credential: {
        id: "api-key-123",
        name: "Production Website",
        keyPrefix: "bp_full-se",
        isActive: true,
        createdAt,
      },
    });

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys",
      method: "POST",
      body: {
        name: "  Production Website  ",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);

    expect(body).toEqual({
      apiKey: "bp_full-secret-key",
      key: {
        id: "api-key-123",
        name: "Production Website",
        keyPrefix: "bp_full-se",
        isActive: true,
        createdAt: createdAt.toISOString(),
      },
    });

    expect(mockedCreateBusinessApiKey).toHaveBeenCalledWith({
      businessId: "business-123",
      name: "Production Website",
    });
  });

  it("returns 500 when API-key creation fails", async () => {
    mockSuccessfulAuthentication();

    mockedCreateBusinessApiKey.mockRejectedValue(new Error("Creation failed"));

    const request = createJsonRequest({
      url: "http://localhost/api/admin/api-keys",
      method: "POST",
      body: {
        name: "Production Website",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Failed to create business API key",
    });
  });
});
