/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { generateBusinessApiKey } from "@/lib/api-keys/generateBusinessApiKey";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

import { GET, POST } from "@/app/api/businesses/[businessId]/api-keys/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/api-keys/generateBusinessApiKey", () => ({
  generateBusinessApiKey: jest.fn(),
}));

const mockedGenerateBusinessApiKey = jest.mocked(generateBusinessApiKey);
const mockedAuthenticateBusinessAccess = jest.mocked(authenticateBusinessAccess);

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/api-keys`;
const context = createRouteContext({ businessId: BUSINESS_ID });

describe("/api/businesses/[businessId]/api-keys", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("GET", () => {
    function getApiKeys(routeContext = context) {
      return GET(createJsonRequest({ url: URL, method: "GET" }), routeContext);
    }

    it("returns 400 when businessId is missing", async () => {
      const response = await getApiKeys(createRouteContext({ businessId: "" }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing businessId" });
    });

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await getApiKeys();

      expect(response.status).toBe(401);
      expect(mockPrisma.businessApiKey.findMany).not.toHaveBeenCalled();
    });

    it("lets every access level view API key metadata", async () => {
      mockFailedAuthentication();

      await getApiKeys();

      expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
        expect.any(Request),
        BUSINESS_ID,
        ["developer", "owner", "admin", "staff"],
      );
    });

    it("returns API-key metadata for the business, newest first", async () => {
      const apiKeys = [
        {
          id: "api-key-123",
          businessId: BUSINESS_ID,
          name: "Production Website",
          keyPrefix: "bp_abc1234",
          isActive: true,
        },
      ];

      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findMany.mockResolvedValue(apiKeys);

      const response = await getApiKeys();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(apiKeys);

      expect(mockPrisma.businessApiKey.findMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID },
        select: {
          id: true,
          businessId: true,
          name: true,
          keyPrefix: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns 500 when listing API keys fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findMany.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await getApiKeys();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to retrieve business API keys",
      });
    });
  });

  describe("POST", () => {
    function postApiKey(body: unknown) {
      return POST(createJsonRequest({ url: URL, method: "POST", body }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication(403, "Forbidden");

      const response = await postApiKey({ name: "Production Website" });

      expect(response.status).toBe(403);
      expect(mockPrisma.businessApiKey.create).not.toHaveBeenCalled();
    });

    it("only lets developers create API keys", async () => {
      mockFailedAuthentication();

      await postApiKey({ name: "Production Website" });

      expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
        expect.any(Request),
        BUSINESS_ID,
        ["developer"],
      );
    });

    it.each([undefined, "", "   ", 42])(
      "returns 400 when the API key name is %p",
      async (name) => {
        mockSuccessfulAuthentication();

        const response = await postApiKey({ name });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          error: "API key name is required",
        });

        expect(mockedGenerateBusinessApiKey).not.toHaveBeenCalled();
      },
    );

    it("creates a Business API key and returns the raw key once", async () => {
      const createdKey = {
        id: "api-key-123",
        name: "Production Website",
        keyPrefix: "bp_abc1234",
        isActive: true,
      };

      mockSuccessfulAuthentication();
      mockedGenerateBusinessApiKey.mockReturnValue({
        apiKey: "bp_abc1234-secret",
        keyHash: "hashed-key",
        keyPrefix: "bp_abc1234",
      });
      mockPrisma.businessApiKey.create.mockResolvedValue(createdKey);

      const response = await postApiKey({ name: " Production Website " });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        apiKey: "bp_abc1234-secret",
        key: createdKey,
      });

      // Only the hash is stored, never the raw key.
      expect(mockPrisma.businessApiKey.create).toHaveBeenCalledWith({
        data: {
          businessId: BUSINESS_ID,
          name: "Production Website",
          keyHash: "hashed-key",
          keyPrefix: "bp_abc1234",
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it("returns 500 when API-key creation fails", async () => {
      mockSuccessfulAuthentication();
      mockedGenerateBusinessApiKey.mockReturnValue({
        apiKey: "bp_abc1234-secret",
        keyHash: "hashed-key",
        keyPrefix: "bp_abc1234",
      });
      mockPrisma.businessApiKey.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postApiKey({ name: "Production Website" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create business API key",
      });
    });
  });
});
