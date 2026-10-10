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

const allowedRoles = [
  AccessLevel.developer,
  AccessLevel.owner,
  AccessLevel.admin,
  AccessLevel.staff,
];

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/business/categories", { headers });
}

async function expectErrorResponse(
  result: unknown,
  status: number,
  body: unknown,
): Promise<void> {
  expect(result).toBeInstanceOf(NextResponse);

  const response = result as NextResponse;

  expect(response.status).toBe(status);
  expect(await response.json()).toEqual(body);
}

describe("authenticateBusinessReadAccess", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("location-scoped requests (default)", () => {
    it("returns 400 when the x-location-id header is missing", async () => {
      const result = await authenticateBusinessReadAccess(
        createRequest({ Authorization: "Bearer bp_valid-key" }),
        allowedRoles,
      );

      await expectErrorResponse(result, 400, { error: "Missing locationId" });

      expect(mockedAuthenticateBusinessApiKey).not.toHaveBeenCalled();
      expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
    });

    it("uses API-key authentication when an Authorization header is present", async () => {
      mockedAuthenticateBusinessApiKey.mockResolvedValue({
        businessId: "business-api-key",
      });

      const request = createRequest({
        Authorization: "Bearer bp_valid-key",
        "x-location-id": "location-123",
      });

      const result = await authenticateBusinessReadAccess(request, allowedRoles);

      expect(result).toEqual({
        businessId: "business-api-key",
        locationId: "location-123",
        authenticationType: "apiKey",
      });

      expect(mockedAuthenticateBusinessApiKey).toHaveBeenCalledWith(request);
      expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
    });

    it("returns 401 when an Authorization header contains an invalid API key", async () => {
      mockedAuthenticateBusinessApiKey.mockResolvedValue(null);

      const result = await authenticateBusinessReadAccess(
        createRequest({
          Authorization: "Bearer bp_invalid-key",
          "x-location-id": "location-123",
        }),
        allowedRoles,
      );

      await expectErrorResponse(result, 401, { error: "Unauthorized" });
    });

    it("does not fall back to the session when an invalid Authorization header is supplied", async () => {
      mockedAuthenticateBusinessApiKey.mockResolvedValue(null);

      await authenticateBusinessReadAccess(
        createRequest({
          Authorization: "Bearer bp_invalid-key",
          "x-location-id": "location-123",
        }),
        allowedRoles,
      );

      expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
    });

    it("returns 400 for a session request without the x-business-id header", async () => {
      const result = await authenticateBusinessReadAccess(
        createRequest({ "x-location-id": "location-123" }),
        allowedRoles,
      );

      await expectErrorResponse(result, 400, { error: "Missing businessId" });

      expect(mockedAuthenticateBusinessAccess).not.toHaveBeenCalled();
    });

    it("uses session authentication when no Authorization header is present", async () => {
      mockedAuthenticateBusinessAccess.mockResolvedValue({
        userId: "user-123",
        businessId: "business-session",
        accessLevel: "owner",
      });

      const request = createRequest({
        "x-business-id": "business-session",
        "x-location-id": "location-123",
      });

      const result = await authenticateBusinessReadAccess(request, allowedRoles);

      expect(result).toEqual({
        userId: "user-123",
        businessId: "business-session",
        locationId: "location-123",
        authenticationType: "session",
      });

      expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
        request,
        "business-session",
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

      const result = await authenticateBusinessReadAccess(
        createRequest({
          "x-business-id": "business-session",
          "x-location-id": "location-123",
        }),
        allowedRoles,
      );

      expect(result).toBe(failedResponse);
    });
  });

  describe("business-scoped requests (requireLocation: false)", () => {
    it("does not require the x-location-id header for an API key", async () => {
      mockedAuthenticateBusinessApiKey.mockResolvedValue({
        businessId: "business-api-key",
      });

      const result = await authenticateBusinessReadAccess(
        createRequest({ Authorization: "Bearer bp_valid-key" }),
        allowedRoles,
        { requireLocation: false },
      );

      expect(result).toEqual({
        businessId: "business-api-key",
        authenticationType: "apiKey",
      });
    });

    it("does not require the x-location-id header for a session", async () => {
      mockedAuthenticateBusinessAccess.mockResolvedValue({
        userId: "user-123",
        businessId: "business-session",
        accessLevel: "staff",
      });

      const result = await authenticateBusinessReadAccess(
        createRequest({ "x-business-id": "business-session" }),
        allowedRoles,
        { requireLocation: false },
      );

      expect(result).toEqual({
        userId: "user-123",
        businessId: "business-session",
        authenticationType: "session",
      });
    });
  });
});
