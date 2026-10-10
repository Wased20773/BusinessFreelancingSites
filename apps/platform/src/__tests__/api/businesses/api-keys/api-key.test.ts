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

import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/api-keys/[apiKeyId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/api-keys/api-key-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  apiKeyId: "api-key-123",
});

const ownershipLookup = {
  where: { id: "api-key-123", businessId: BUSINESS_ID },
  select: { id: true },
};

describe("/api/businesses/[businessId]/api-keys/[apiKeyId]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("PATCH", () => {
    function patchApiKey(body: unknown, routeContext = context) {
      return PATCH(
        createJsonRequest({ url: URL, method: "PATCH", body }),
        routeContext,
      );
    }

    it("returns 400 when apiKeyId is missing", async () => {
      const response = await patchApiKey(
        { isActive: false },
        createRouteContext({ businessId: BUSINESS_ID, apiKeyId: "" }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing apiKeyId" });
    });

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchApiKey({ isActive: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.businessApiKey.update).not.toHaveBeenCalled();
    });

    it.each([
      [{ name: "  " }, "API key name must be a non-empty string"],
      [{ isActive: "false" }, "isActive must be a boolean"],
      [{}, "Provide a name or isActive value to update"],
    ])("returns 400 for %p", async (body, error) => {
      mockSuccessfulAuthentication();

      const response = await patchApiKey(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.businessApiKey.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the API key does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findFirst.mockResolvedValue(null);

      const response = await patchApiKey({ isActive: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "API key not found" });

      expect(mockPrisma.businessApiKey.findFirst).toHaveBeenCalledWith(
        ownershipLookup,
      );
      expect(mockPrisma.businessApiKey.update).not.toHaveBeenCalled();
    });

    it("renames and deactivates the API key", async () => {
      const updatedKey = {
        id: "api-key-123",
        name: "Staging Website",
        keyPrefix: "bp_abc1234",
        isActive: false,
      };

      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findFirst.mockResolvedValue({ id: "api-key-123" });
      mockPrisma.businessApiKey.update.mockResolvedValue(updatedKey);

      const response = await patchApiKey({
        name: " Staging Website ",
        isActive: false,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedKey);

      expect(mockPrisma.businessApiKey.update).toHaveBeenCalledWith({
        where: { id: "api-key-123" },
        data: { name: "Staging Website", isActive: false },
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
      mockPrisma.businessApiKey.findFirst.mockResolvedValue({ id: "api-key-123" });
      mockPrisma.businessApiKey.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchApiKey({ isActive: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update business API key",
      });
    });
  });

  describe("DELETE", () => {
    function deleteApiKey() {
      return DELETE(createJsonRequest({ url: URL, method: "DELETE" }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteApiKey();

      expect(response.status).toBe(401);
      expect(mockPrisma.businessApiKey.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the key does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findFirst.mockResolvedValue(null);

      const response = await deleteApiKey();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "API key not found" });

      expect(mockPrisma.businessApiKey.findFirst).toHaveBeenCalledWith(
        ownershipLookup,
      );
      expect(mockPrisma.businessApiKey.delete).not.toHaveBeenCalled();
    });

    it("deletes an API key belonging to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findFirst.mockResolvedValue({ id: "api-key-123" });

      const response = await deleteApiKey();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "API key deleted successfully",
      });

      expect(mockPrisma.businessApiKey.delete).toHaveBeenCalledWith({
        where: { id: "api-key-123" },
      });
    });

    it("returns 500 when deleting the API key fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessApiKey.findFirst.mockResolvedValue({ id: "api-key-123" });
      mockPrisma.businessApiKey.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteApiKey();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete business API key",
      });
    });
  });
});
