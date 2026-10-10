/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import {
  BUSINESS_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { Prisma } from "@business-freelancer/database";
import { getObjectUrl } from "@/lib/s3/get-url";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

import { GET as GET_BUSINESSES } from "@/app/api/businesses/route";
import {
  GET as GET_BUSINESS,
  PATCH,
} from "@/app/api/businesses/[businessId]/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const mockedGetObjectUrl = jest.mocked(getObjectUrl);
const mockedAuthenticateBusinessAccess = jest.mocked(authenticateBusinessAccess);

const URL = `http://localhost/api/businesses/${BUSINESS_ID}`;
const context = createRouteContext({ businessId: BUSINESS_ID });

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("/api/businesses", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("GET /api/businesses", () => {
    it("returns 401 when there is no session", async () => {
      mockedAuth.mockResolvedValue(null);

      const response = await GET_BUSINESSES();

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it("returns 500 when fetching the businesses fails", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.businessUser.findMany.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await GET_BUSINESSES();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to fetch businesses",
      });
    });

    it("returns every business the user belongs to, oldest membership first", async () => {
      const memberships = [
        {
          id: "business-user-1",
          role: { accessLevel: "owner" },
          business: {
            id: BUSINESS_ID,
            name: "Tacos El Guero",
            slug: "tacos-el-guero",
            domain: null,
          },
        },
      ];

      mockedAuth.mockResolvedValue(session);
      mockPrisma.businessUser.findMany.mockResolvedValue(memberships);

      const response = await GET_BUSINESSES();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(memberships);

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        select: {
          id: true,
          role: { select: { accessLevel: true } },
          business: {
            select: { id: true, name: true, slug: true, domain: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("GET /api/businesses/[businessId]", () => {
    function getBusiness(routeContext = context) {
      return GET_BUSINESS(
        createJsonRequest({ url: URL, method: "GET" }),
        routeContext,
      );
    }

    it("returns 400 when businessId is missing", async () => {
      const response = await getBusiness(createRouteContext({ businessId: "" }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing businessId" });
    });

    it("returns the authentication error response", async () => {
      mockFailedAuthentication(403, "Forbidden");

      const response = await getBusiness();

      expect(response.status).toBe(403);
      expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
    });

    it("allows every access level to view the business", async () => {
      mockFailedAuthentication();

      await getBusiness();

      expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
        expect.any(Request),
        BUSINESS_ID,
        ["owner", "admin", "staff", "developer"],
      );
    });

    it("returns 404 when the business membership is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);

      const response = await getBusiness();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "Business could not be found",
      });
    });

    it("returns 500 when fetching the business fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await getBusiness();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to fetch business",
      });
    });

    it("returns the business with viewable image URLs and the user's role", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        business: {
          id: BUSINESS_ID,
          name: "Tacos El Guero",
          slug: "tacos-el-guero",
          domain: "tacoselguero.com",
          imageKey: "businesses/business-123/image.webp",
          originalImageKey: null,
        },
        role: { accessLevel: "owner", description: "Full access" },
      });
      mockedGetObjectUrl.mockResolvedValue("https://signed.example/image.webp");

      const response = await getBusiness();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: BUSINESS_ID,
        name: "Tacos El Guero",
        slug: "tacos-el-guero",
        domain: "tacoselguero.com",
        imageKey: "https://signed.example/image.webp",
        originalImageKey: null,
        role: { accessLevel: "owner", description: "Full access" },
      });

      expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: BUSINESS_ID, userId: "user-123" },
        }),
      );

      expect(mockedGetObjectUrl).toHaveBeenCalledTimes(1);
      expect(mockedGetObjectUrl).toHaveBeenCalledWith(
        "businesses/business-123/image.webp",
      );
    });
  });

  describe("PATCH /api/businesses/[businessId]", () => {
    const businessSelect = {
      id: true,
      name: true,
      slug: true,
      domain: true,
      createdAt: true,
      updatedAt: true,
    };

    function patchBusiness(body: unknown) {
      return PATCH(createJsonRequest({ url: URL, method: "PATCH", body }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchBusiness({ name: "New Name" });

      expect(response.status).toBe(401);
      expect(mockPrisma.business.update).not.toHaveBeenCalled();
    });

    it("only allows owners and admins to update the business", async () => {
      mockFailedAuthentication();

      await patchBusiness({ name: "New Name" });

      expect(mockedAuthenticateBusinessAccess).toHaveBeenCalledWith(
        expect.any(Request),
        BUSINESS_ID,
        ["owner", "admin"],
      );
    });

    it.each([
      [{ name: "  " }, "Business name is required"],
      [{ domain: 42 }, "Business domain is required"],
      [{}, "No supported fields were provided"],
    ])("returns 400 for %p", async (body, error) => {
      mockSuccessfulAuthentication();

      const response = await patchBusiness(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.business.update).not.toHaveBeenCalled();
    });

    it("returns 409 when the domain is already used by another business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      const response = await patchBusiness({ domain: "taken.com" });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "This domain is already used by another business",
      });
    });

    it("returns 500 when updating the business fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.business.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchBusiness({ name: "New Name" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update business",
      });
    });

    it("successfully updates the name and normalizes the domain", async () => {
      const updatedBusiness = {
        id: BUSINESS_ID,
        name: "Tacos El Guero PDX",
        slug: "tacos-el-guero",
        domain: "tacos-el-guero.com",
      };

      mockSuccessfulAuthentication();
      mockPrisma.business.update.mockResolvedValue(updatedBusiness);

      const response = await patchBusiness({
        name: " Tacos El Guero PDX ",
        domain: " Tacos El Guero.COM ",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedBusiness);

      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: BUSINESS_ID },
        data: { name: "Tacos El Guero PDX", domain: "tacos-el-guero.com" },
        select: businessSelect,
      });
    });
  });
});
