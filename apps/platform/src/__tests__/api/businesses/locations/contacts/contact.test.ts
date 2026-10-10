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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/contacts/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/contacts/[contactId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/contacts`;

const contactBody = {
  phoneNumber: "503-555-1234",
  email: "contact@example.com",
  isPersonal: false,
};

const locationContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const contactContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  contactId: "contact-123",
});

function postContact(body: unknown) {
  return POST(
    createJsonRequest({ url: BASE_URL, method: "POST", body }),
    locationContext,
  );
}

function patchContact(body: unknown) {
  return PATCH(
    createJsonRequest({
      url: `${BASE_URL}/contact-123`,
      method: "PATCH",
      body,
    }),
    contactContext,
  );
}

function deleteContact(body: unknown) {
  return DELETE(
    createJsonRequest({
      url: `${BASE_URL}/contact-123`,
      method: "DELETE",
      body,
    }),
    contactContext,
  );
}

describe("/api/businesses/[businessId]/locations/[locationId]/contacts", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postContact({ ...contactBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized Access" });

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postContact({ ...contactBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("returns 400 when both the phone number and email are missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postContact({ isPersonal: false, isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "A contact must include either a phone number or an email",
      });

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postContact(contactBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });

    it("returns 500 when creating the contact fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      mockPrisma.contact.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postContact({ ...contactBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create contact",
      });
    });

    it("successfully creates a contact in the selected location", async () => {
      const createdContact = {
        id: "contact-123",
        locationId: LOCATION_ID,
        ...contactBody,
        isSynced: false,
        syncGroupId: null,
        createdAt: new Date("2026-07-17T12:00:00.000Z"),
        updatedAt: new Date("2026-07-17T12:00:00.000Z"),
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.create.mockResolvedValue(createdContact);

      const response = await postContact({ ...contactBody, isSynced: false });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        ...createdContact,
        createdAt: createdContact.createdAt.toISOString(),
        updatedAt: createdContact.updatedAt.toISOString(),
      });

      expect(mockPrisma.contact.create).toHaveBeenCalledWith({
        data: {
          ...contactBody,
          locationId: LOCATION_ID,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          locationId: true,
          phoneNumber: true,
          email: true,
          isPersonal: true,
          isSynced: true,
          syncGroupId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(mockPrisma.contact.createMany).not.toHaveBeenCalled();
    });

    it("successfully creates a synchronized contact in every location", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValue("sync-group-123" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      mockPrisma.location.findMany.mockResolvedValue([
        { id: LOCATION_ID },
        { id: "location-456" },
      ]);

      mockPrisma.contact.createMany.mockResolvedValue({ count: 2 });

      const response = await postContact({ ...contactBody, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized contact's created successfully",
        count: 2,
        syncGroupId: "sync-group-123",
      });

      expect(mockPrisma.contact.createMany).toHaveBeenCalledWith({
        data: [LOCATION_ID, "location-456"].map((locationId) => ({
          ...contactBody,
          locationId,
          syncGroupId: "sync-group-123",
          isSynced: true,
        })),
      });

      expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /[contactId]", () => {
    const updateBody = {
      phoneNumber: "503-555-9876",
      email: "updated@example.com",
      isPersonal: true,
    };

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchContact({ ...updateBody, isSynced: false });

      expect(response.status).toBe(401);

      expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchContact({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);

      expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when both the phone number and email are missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchContact({ isPersonal: true, isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "A contact must include either a phone number or an email",
      });
    });

    it("returns 404 when the contact is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const response = await patchContact({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This contact does not exist in our records",
      });

      expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    });

    it("returns 500 when updating the contact fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "contact-123",
        syncGroupId: null,
      });
      mockPrisma.contact.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchContact({ ...updateBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update contact",
      });
    });

    it("successfully updates only the selected contact", async () => {
      const updatedContact = {
        id: "contact-123",
        locationId: LOCATION_ID,
        ...updateBody,
        syncGroupId: "sync-group-123",
        isSynced: false,
        updatedAt: new Date("2026-07-17T12:00:00.000Z"),
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "contact-123",
        syncGroupId: "sync-group-123",
      });
      mockPrisma.contact.update.mockResolvedValue(updatedContact);

      const response = await patchContact({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ...updatedContact,
        updatedAt: updatedContact.updatedAt.toISOString(),
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith({
        where: { id: "contact-123", locationId: LOCATION_ID },
        data: { ...updateBody, isSynced: false },
        select: {
          id: true,
          locationId: true,
          phoneNumber: true,
          email: true,
          isPersonal: true,
          syncGroupId: true,
          isSynced: true,
          updatedAt: true,
        },
      });

      expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    });

    it("successfully updates every synchronized contact in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst
        .mockResolvedValueOnce({ id: "contact-123", syncGroupId: "sync-group-123" })
        .mockResolvedValueOnce({ id: "contact-123", ...updateBody });
      mockPrisma.contact.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchContact({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized contact's updated successfully",
        id: "contact-123",
        ...updateBody,
      });

      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "contact-123" }],
        },
        data: { ...updateBody, isSynced: true },
      });
    });
  });

  describe("DELETE /[contactId]", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteContact({ deleteAllSynced: false });

      expect(response.status).toBe(401);

      expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
      expect(mockPrisma.contact.deleteMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteContact({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);

      expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteContact({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the contact is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const response = await deleteContact({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This contact does not exist in our records",
      });

      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
        where: { id: "contact-123", locationId: LOCATION_ID },
        select: { id: true, syncGroupId: true },
      });
    });

    it("returns 500 when deleting the contact fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "contact-123",
        syncGroupId: null,
      });
      mockPrisma.contact.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteContact({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete contact",
      });
    });

    it("successfully deletes only the selected contact", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "contact-123",
        syncGroupId: "sync-group-123",
      });

      const response = await deleteContact({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "CONTACT deleted successfully",
      });

      expect(mockPrisma.contact.delete).toHaveBeenCalledWith({
        where: { id: "contact-123", locationId: LOCATION_ID },
      });

      expect(mockPrisma.contact.deleteMany).not.toHaveBeenCalled();
    });

    it("successfully deletes every synchronized contact in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: "contact-123",
        syncGroupId: "sync-group-123",
      });

      const response = await deleteContact({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized contact's deleted successfully",
      });

      expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "contact-123" }],
        },
      });

      expect(mockPrisma.contact.delete).not.toHaveBeenCalled();
    });
  });
});
