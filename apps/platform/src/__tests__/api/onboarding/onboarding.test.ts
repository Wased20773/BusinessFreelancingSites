/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { Prisma } from "@business-freelancer/database";

import { PATCH } from "@/app/api/onboarding/route";
import { POST as POST_BUSINESS } from "@/app/api/onboarding/business/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("/api/onboarding", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("PATCH /api/onboarding", () => {
    function completeOnboarding(body: unknown) {
      return PATCH(
        createJsonRequest({
          url: "http://localhost/api/onboarding",
          method: "PATCH",
          body,
        }),
      );
    }

    it("returns 401 when there is no session", async () => {
      mockedAuth.mockResolvedValue(null);

      const response = await completeOnboarding({ onboardingIntent: "business" });

      expect(response.status).toBe(401);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns 400 when the onboarding intent is invalid", async () => {
      mockedAuth.mockResolvedValue(session);

      const response = await completeOnboarding({ onboardingIntent: "investor" });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Invalid onboarding intent",
      });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns 500 when saving the onboarding intent fails", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.update.mockRejectedValue(new Error("Database update failed"));

      const response = await completeOnboarding({ onboardingIntent: "business" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to complete onboarding",
      });
    });

    it.each(["staff", "business", "developer"])(
      'completes onboarding with the "%s" intent',
      async (onboardingIntent) => {
        const user = { onboardingIntent, onboardingCompleted: true };

        mockedAuth.mockResolvedValue(session);
        mockPrisma.user.update.mockResolvedValue(user);

        const response = await completeOnboarding({ onboardingIntent });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          message: "Onboarding completed successfully",
          user,
        });

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { email: "tester@example.com" },
          data: { onboardingIntent, onboardingCompleted: true },
          select: { onboardingIntent: true, onboardingCompleted: true },
        });
      },
    );
  });

  describe("POST /api/onboarding/business", () => {
    const businessBody = {
      name: "Tacos El Guero",
      address: "123 Example St",
      city: "Portland",
      state: "OR",
      zip: "97201",
      country: "",
      parking: true,
    };

    const createdBusiness = {
      id: "business-123",
      name: "Tacos El Guero",
      slug: "tacos-el-guero",
      domain: null,
    };

    const createdLocation = { id: "location-123", address: "123 Example St" };

    function createBusiness(body: unknown) {
      return POST_BUSINESS(
        createJsonRequest({
          url: "http://localhost/api/onboarding/business",
          method: "POST",
          body,
        }),
      );
    }

    function mockSuccessfulSetup() {
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-owner" });
      mockPrisma.business.create.mockResolvedValue(createdBusiness);
      mockPrisma.location.create.mockResolvedValue(createdLocation);
      mockPrisma.businessUser.create.mockResolvedValue({});
    }

    it("returns 401 when there is no session", async () => {
      mockedAuth.mockResolvedValue(null);

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(401);
      expect(mockPrisma.business.create).not.toHaveBeenCalled();
    });

    it.each([
      [{ ...businessBody, name: "  " }, "A business name is required"],
      [{ ...businessBody, address: undefined }, "A location address is required"],
      [{ ...businessBody, name: "!!!" }, "A valid business name is required"],
    ])("returns 400 for an invalid body", async (body, error) => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-owner" });

      const response = await createBusiness(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.business.create).not.toHaveBeenCalled();
    });

    it("returns 500 when the owner role does not exist", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.role.findFirst.mockResolvedValue(null);

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "The owner role could not be found",
      });
    });

    it("creates the business, its first location, and the owner membership", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.business.findMany.mockResolvedValue([]);
      mockSuccessfulSetup();

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Business created successfully",
        business: createdBusiness,
        location: createdLocation,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      expect(mockPrisma.business.create).toHaveBeenCalledWith({
        data: { name: "Tacos El Guero", slug: "tacos-el-guero" },
        select: { id: true, name: true, slug: true, domain: true },
      });

      expect(mockPrisma.location.create).toHaveBeenCalledWith({
        data: {
          businessId: "business-123",
          address: "123 Example St",
          country: null,
          state: "OR",
          city: "Portland",
          zip: "97201",
          parking: true,
        },
        select: { id: true, address: true },
      });

      expect(mockPrisma.businessUser.create).toHaveBeenCalledWith({
        data: {
          businessId: "business-123",
          userId: "user-123",
          roleId: "role-owner",
        },
      });
    });

    it("numbers the slug when another business already uses the name", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.business.findMany.mockResolvedValue([
        { slug: "tacos-el-guero" },
        { slug: "tacos-el-guero-2" },
        { slug: "tacos-el-guero-pdx" },
      ]);
      mockSuccessfulSetup();

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(201);

      expect(mockPrisma.business.findMany).toHaveBeenCalledWith({
        where: { slug: { startsWith: "tacos-el-guero" } },
        select: { slug: true },
      });

      expect(mockPrisma.business.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "Tacos El Guero", slug: "tacos-el-guero-3" },
        }),
      );
    });

    it("returns 409 when the slug is claimed between the check and the create", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.business.findMany.mockResolvedValue([]);
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-owner" });
      mockPrisma.business.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A business with this name was just created. Please try again",
      });
    });

    it("returns 500 when creating the business fails", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.business.findMany.mockResolvedValue([]);
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-owner" });
      mockPrisma.business.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await createBusiness(businessBody);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create the business",
      });
    });
  });
});
