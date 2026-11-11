/**
 * @jest-environment node
 */

import { createHash } from "node:crypto";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("authenticateBusinessApiKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the Authorization header is missing", async () => {
    const request = new Request("http://localhost/api/business/categories");

    const result = await authenticateBusinessApiKey(request);

    expect(result).toBeNull();
    expect(mockPrisma.businessApiKey.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the Authorization header does not use Bearer", async () => {
    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Basic abc123",
      },
    });

    const result = await authenticateBusinessApiKey(request);

    expect(result).toBeNull();
    expect(mockPrisma.businessApiKey.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the Bearer token is empty", async () => {
    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer ",
      },
    });

    const result = await authenticateBusinessApiKey(request);

    expect(result).toBeNull();
    expect(mockPrisma.businessApiKey.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the key does not exist", async () => {
    mockPrisma.businessApiKey.findUnique.mockResolvedValue(null);

    const apiKey = "bp_invalid-key";

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const result = await authenticateBusinessApiKey(request);

    const expectedHash = createHash("sha256").update(apiKey).digest("hex");

    expect(result).toBeNull();

    expect(mockPrisma.businessApiKey.findUnique).toHaveBeenCalledWith({
      where: {
        keyHash: expectedHash,
      },
      select: {
        businessId: true,
        isActive: true,
        allowedOrigins: true,
      },
    });
  });

  it("returns null when the key is inactive", async () => {
    mockPrisma.businessApiKey.findUnique.mockResolvedValue({
      businessId: "business-123",
      isActive: false,
    });

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer bp_inactive-key",
      },
    });

    const result = await authenticateBusinessApiKey(request);

    expect(result).toBeNull();
  });

  it("returns the associated businessId for an active valid key", async () => {
    mockPrisma.businessApiKey.findUnique.mockResolvedValue({
      businessId: "business-123",
      isActive: true,
    });

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer bp_valid-key",
      },
    });

    const result = await authenticateBusinessApiKey(request);

    expect(result).toEqual({
      businessId: "business-123",
    });
  });

  describe("browser origin restrictions", () => {
    function createBrowserRequest(origin: string): Request {
      return new Request("http://localhost/api/business/categories", {
        headers: {
          Authorization: "Bearer bp_valid-key",
          Origin: origin,
        },
      });
    }

    it("allows requests without an Origin header (server-to-server)", async () => {
      mockPrisma.businessApiKey.findUnique.mockResolvedValue({
        businessId: "business-123",
        isActive: true,
        allowedOrigins: [],
      });

      const request = new Request("http://localhost/api/business/categories", {
        headers: {
          Authorization: "Bearer bp_valid-key",
        },
      });

      expect(await authenticateBusinessApiKey(request)).toEqual({
        businessId: "business-123",
      });
    });

    it("blocks browser requests when the key has no allowed origins", async () => {
      mockPrisma.businessApiKey.findUnique.mockResolvedValue({
        businessId: "business-123",
        isActive: true,
        allowedOrigins: [],
      });

      const result = await authenticateBusinessApiKey(
        createBrowserRequest("https://example.com"),
      );

      expect(result).toEqual({ blockedOrigin: "https://example.com" });
    });

    it("allows a browser request from an allowed origin", async () => {
      mockPrisma.businessApiKey.findUnique.mockResolvedValue({
        businessId: "business-123",
        isActive: true,
        allowedOrigins: ["https://example.com", "http://localhost:5173"],
      });

      const result = await authenticateBusinessApiKey(
        createBrowserRequest("http://localhost:5173"),
      );

      expect(result).toEqual({ businessId: "business-123" });
    });

    it("blocks a browser request from an origin that is not allowed", async () => {
      mockPrisma.businessApiKey.findUnique.mockResolvedValue({
        businessId: "business-123",
        isActive: true,
        allowedOrigins: ["https://example.com"],
      });

      const result = await authenticateBusinessApiKey(
        createBrowserRequest("https://evil-example.com"),
      );

      expect(result).toEqual({ blockedOrigin: "https://evil-example.com" });
    });

    it("still returns null for an inactive key from an allowed origin", async () => {
      mockPrisma.businessApiKey.findUnique.mockResolvedValue({
        businessId: "business-123",
        isActive: false,
        allowedOrigins: ["https://example.com"],
      });

      const result = await authenticateBusinessApiKey(
        createBrowserRequest("https://example.com"),
      );

      expect(result).toBeNull();
    });
  });

  it("allows whitespace surrounding the Bearer key", async () => {
    mockPrisma.businessApiKey.findUnique.mockResolvedValue({
      businessId: "business-123",
      isActive: true,
    });

    const request = new Request("http://localhost/api/business/categories", {
      headers: {
        Authorization: "Bearer   bp_valid-key   ",
      },
    });

    const result = await authenticateBusinessApiKey(request);

    expect(result).toEqual({
      businessId: "business-123",
    });
  });
});
