/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  LOCATION_ID,
  LOCATION_NOT_FOUND,
  mockFailedAuthentication,
  mockLocationInBusiness,
  mockLocationNotInBusiness,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { Prisma } from "@business-freelancer/database";

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/socials/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/socials/[socialId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/socials`;

const socialBody = {
  domain: "instagram.com",
  profileName: "tacos.el_guero",
  icon: "businesses/icons/socials/instagram.webp",
};

const expectedSocialData = {
  ...socialBody,
  url: "https://instagram.com/tacos.el_guero",
};

const locationContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const socialContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  socialId: "social-123",
});

function postSocial(body: unknown) {
  return POST(
    createJsonRequest({ url: BASE_URL, method: "POST", body }),
    locationContext,
  );
}

function patchSocial(body: unknown) {
  return PATCH(
    createJsonRequest({ url: `${BASE_URL}/social-123`, method: "PATCH", body }),
    socialContext,
  );
}

function deleteSocial(body: unknown) {
  return DELETE(
    createJsonRequest({ url: `${BASE_URL}/social-123`, method: "DELETE", body }),
    socialContext,
  );
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

describe("/api/businesses/[businessId]/locations/[locationId]/socials", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postSocial({ ...socialBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized Access" });

      expect(mockPrisma.social.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postSocial({ ...socialBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);

      expect(mockPrisma.social.create).not.toHaveBeenCalled();
    });

    it.each([
      ["domain", "Missing Domain Name"],
      ["profileName", "Missing social profile name"],
      ["icon", "Missing social icon"],
    ])("returns 400 when the %s is missing", async (field, error) => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postSocial({
        ...socialBody,
        [field]: undefined,
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.social.create).not.toHaveBeenCalled();
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postSocial(socialBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 409 when the social profile already exists in the location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.create.mockRejectedValue(uniqueConstraintError());

      const response = await postSocial({ ...socialBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "This social profile already exists in this location",
      });
    });

    it("returns 500 when creating the social fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postSocial({ ...socialBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create social",
      });
    });

    it("successfully creates a social and keeps the handle's characters in the URL", async () => {
      const createdSocial = {
        id: "social-123",
        locationId: LOCATION_ID,
        ...expectedSocialData,
        isSynced: false,
        syncGroupId: null,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.create.mockResolvedValue(createdSocial);

      const response = await postSocial({ ...socialBody, isSynced: false });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(createdSocial);

      expect(mockPrisma.social.create).toHaveBeenCalledWith({
        data: {
          ...expectedSocialData,
          locationId: LOCATION_ID,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          locationId: true,
          domain: true,
          profileName: true,
          url: true,
          icon: true,
          isSynced: true,
          syncGroupId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("successfully creates a synchronized social in every location", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValue("sync-group-123" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.location.findMany.mockResolvedValue([
        { id: LOCATION_ID },
        { id: "location-456" },
      ]);
      mockPrisma.social.createMany.mockResolvedValue({ count: 2 });

      const response = await postSocial({ ...socialBody, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized social's created successfully",
        count: 2,
        syncGroupId: "sync-group-123",
      });

      expect(mockPrisma.social.createMany).toHaveBeenCalledWith({
        data: [LOCATION_ID, "location-456"].map((locationId) => ({
          ...expectedSocialData,
          locationId,
          syncGroupId: "sync-group-123",
          isSynced: true,
        })),
      });
    });
  });

  describe("PATCH /[socialId]", () => {
    const updateBody = {
      domain: "instagram.com",
      profileName: "tacoselguero-PDX",
      icon: "businesses/icons/socials/instagram.webp",
    };

    const expectedUpdateData = {
      ...updateBody,
      url: "https://instagram.com/tacoselguero-PDX",
    };

    const updateSelect = {
      id: true,
      domain: true,
      profileName: true,
      url: true,
      icon: true,
      syncGroupId: true,
      isSynced: true,
    };

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.social.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the domain or profile name is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchSocial({
        ...updateBody,
        profileName: "",
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "A social must include a domain and profile name",
      });
    });

    it("returns 400 when the icon is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchSocial({
        ...updateBody,
        icon: undefined,
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Social is missing an icon",
      });
    });

    it("returns 404 when the social is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue(null);

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This social does not exist in our records",
      });
    });

    it("returns 409 when the updated profile already exists in the location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: null,
      });
      mockPrisma.social.update.mockRejectedValue(uniqueConstraintError());

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "This social profile already exists in this location",
      });
    });

    it("returns 500 when updating the social fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: null,
      });
      mockPrisma.social.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update social",
      });
    });

    it("successfully updates only the selected social", async () => {
      const updatedSocial = {
        id: "social-123",
        ...expectedUpdateData,
        syncGroupId: null,
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: null,
      });
      mockPrisma.social.update.mockResolvedValue(updatedSocial);

      const response = await patchSocial({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedSocial);

      expect(mockPrisma.social.update).toHaveBeenCalledWith({
        where: { id: "social-123", locationId: LOCATION_ID },
        data: { ...expectedUpdateData, isSynced: false },
        select: updateSelect,
      });
    });

    it("successfully updates every synchronized social in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst
        .mockResolvedValueOnce({ id: "social-123", syncGroupId: "sync-group-123" })
        .mockResolvedValueOnce({ id: "social-123", ...expectedUpdateData });
      mockPrisma.social.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchSocial({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized social's updated successfully",
        id: "social-123",
        ...expectedUpdateData,
      });

      expect(mockPrisma.social.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "social-123" }],
        },
        data: { ...expectedUpdateData, isSynced: true },
      });
    });
  });

  describe("DELETE /[socialId]", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteSocial({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.social.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteSocial({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteSocial({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the social is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue(null);

      const response = await deleteSocial({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This social does not exist in our records",
      });
    });

    it("returns 500 when deleting the social fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: null,
      });
      mockPrisma.social.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteSocial({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete social",
      });
    });

    it("successfully deletes only the selected social", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: "sync-group-123",
      });

      const response = await deleteSocial({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "SOCIAL deleted successfully",
      });

      expect(mockPrisma.social.delete).toHaveBeenCalledWith({
        where: { id: "social-123", locationId: LOCATION_ID },
      });
    });

    it("successfully deletes every synchronized social in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.social.findFirst.mockResolvedValue({
        id: "social-123",
        syncGroupId: "sync-group-123",
      });

      const response = await deleteSocial({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized social's deleted successfully",
      });

      expect(mockPrisma.social.deleteMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "social-123" }],
        },
      });
    });
  });
});
