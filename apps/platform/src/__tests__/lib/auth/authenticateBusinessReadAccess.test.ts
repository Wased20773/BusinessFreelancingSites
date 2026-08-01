/**
 * @jest-environment node
 */

import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";

import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/api-keys/authenticateBusinessApiKey", () => ({
  authenticateBusinessApiKey: jest.fn(),
}));

const mockedAuthenticateBusinessAccess = jest.mocked(
  authenticateBusinessAccess,
);

const mockedAuthenticateBusinessApiKey = jest.mocked(
  authenticateBusinessApiKey,
);

describe("authenticateBusinessReadAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const allowedRoles = [
    AccessLevel.developer,
    AccessLevel.owner,
    AccessLevel.admin,
    AccessLevel.staff,
  ];

  it("uses API-key authentication when an Authorization header is present", async () => {
    mockedAuthenticateBusinessApiKey.mockResolvedValue({
      businessId: "business-api-key",
    });

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer bp_valid-key",
      },
    });

    const result = await authenticateBusinessReadAccess(request, allowedRoles);

    expect(result).toEqual({
      businessId: "business-api-key",
      authenticationType: "apiKey",
    });

    expect(mockedAuthenticateBusinessApiKey).toHaveBeenCalledWith(request);

    expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
  });

  it("returns 401 when an Authorization header contains an invalid API key", async () => {
    mockedAuthenticateBusinessApiKey.mockResolvedValue(null);

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer bp_invalid-key",
      },
    });

    const result = await authenticateBusinessReadAccess(request, allowedRoles);

    expect(result).toBeInstanceOf(NextResponse);

    const response = result as NextResponse;
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "Unauthorized",
    });

    expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
  });

  it("does not fall back to the session when an invalid Authorization header is supplied", async () => {
    mockedAuthenticateBusinessApiKey.mockResolvedValue(null);

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer bp_invalid-key",
      },
    });

    await authenticateBusinessReadAccess(request, allowedRoles);

    expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
  });

  it("uses session authentication when no Authorization header is present", async () => {
    mockedAuthenticateBusinessAccess.mockResolvedValue({
      userId: "user-123",
      businessId: "business-session",
    });

    const request = new Request("http://localhost/api/business/categories");

    const result = await authenticateBusinessReadAccess(request, allowedRoles);

    expect(result).toEqual({
      userId: "user-123",
      businessId: "business-session",
      authenticationType: "session",
    });

    expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockedAuthenticateBusinessApiKey).not.toHaveBeenCalled();
  });

  it("returns the failed session response", async () => {
    const failedResponse = NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );

    mockedAuthenticateBusinessAccess.mockResolvedValue(failedResponse);

    const request = new Request("http://localhost/api/business/categories");

    const result = await authenticateBusinessReadAccess(request, allowedRoles);

    expect(result).toBe(failedResponse);
  });
});
