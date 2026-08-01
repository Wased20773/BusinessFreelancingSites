/**
 * @jest-environment node
 */

import { createHash } from "node:crypto";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { authenticateBusinessApiKey } from "@/lib/api-keys/authenticateBusinessApiKey";

jest.mock("@/lib/prisma", () => {
  const { mockPrisma } = require("@/__tests__/mocks/prisma");

  return {
    prisma: mockPrisma,
  };
});

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
