/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  LOCATION_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { Prisma } from "@business-freelancer/database";
import { deleteObject } from "@/lib/s3/delete";

import { POST } from "@/app/api/businesses/[businessId]/locations/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/route";
import { GET as GET_OVERVIEW } from "@/app/api/businesses/[businessId]/locations/[locationId]/overview/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const mockedDeleteObject = jest.mocked(deleteObject);

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations`;

const businessContext = createRouteContext({ businessId: BUSINESS_ID });

const locationContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const locationSelect = {
  id: true,
  address: true,
  zip: true,
  country: true,
  state: true,
  city: true,
  parking: true,
  isActive: true,
  enableHours: true,
  createdAt: true,
  updatedAt: true,
};

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

describe("/api/businesses/[businessId]/locations", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    function postLocation(body: unknown, context = businessContext) {
      return POST(
        createJsonRequest({ url: BASE_URL, method: "POST", body }),
        context,
      );
    }

    it("returns 400 when businessId is missing", async () => {
      const response = await postLocation(
        { address: "123 Example St" },
        createRouteContext({ businessId: "" }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing businessId" });
    });

    it("returns the authentication error response", async () => {
      mockFailedAuthentication(403, "Forbidden");

      const response = await postLocation({ address: "123 Example St" });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden" });

      expect(mockPrisma.location.create).not.toHaveBeenCalled();
    });

    it.each([undefined, "", "   ", 42])(
      "returns 400 when the location address is %p",
      async (address) => {
        mockSuccessfulAuthentication();

        const response = await postLocation({ address });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          error: "A location address is required",
        });

        expect(mockPrisma.location.create).not.toHaveBeenCalled();
      },
    );

    it("returns 409 when the business already has a location at the address", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue({ id: "existing" });

      const response = await postLocation({ address: "123 Example St" });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A location with this address already exists for this business",
      });

      expect(mockPrisma.location.findUnique).toHaveBeenCalledWith({
        where: {
          businessId_address: {
            businessId: BUSINESS_ID,
            address: "123 Example St",
          },
        },
        select: { id: true },
      });

      expect(mockPrisma.location.create).not.toHaveBeenCalled();
    });

    it("returns 409 when the address is claimed between the check and the create", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue(null);
      mockPrisma.location.create.mockRejectedValue(uniqueConstraintError());

      const response = await postLocation({ address: "123 Example St" });

      expect(response.status).toBe(409);
    });

    it("returns 500 when creating the location fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue(null);
      mockPrisma.location.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postLocation({ address: "123 Example St" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create business location",
      });
    });

    it("successfully creates a location with trimmed optional fields", async () => {
      const createdLocation = {
        id: LOCATION_ID,
        address: "123 Example St",
        zip: "12345",
        country: null,
        state: "OR",
        city: "Portland",
        parking: true,
        isActive: true,
      };

      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue(null);
      mockPrisma.location.create.mockResolvedValue(createdLocation);

      const response = await postLocation({
        address: "  123 Example St  ",
        zip: "12345",
        country: "",
        state: " OR ",
        city: "Portland",
        parking: true,
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Location created successfully",
        location: createdLocation,
      });

      expect(mockPrisma.location.create).toHaveBeenCalledWith({
        data: {
          businessId: BUSINESS_ID,
          address: "123 Example St",
          city: "Portland",
          state: "OR",
          zip: "12345",
          country: null,
          parking: true,
        },
        select: {
          id: true,
          address: true,
          zip: true,
          country: true,
          state: true,
          city: true,
          parking: true,
          isActive: true,
        },
      });
    });

    it("defaults parking to false for a non-boolean value", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue(null);
      mockPrisma.location.create.mockResolvedValue({ id: LOCATION_ID });

      await postLocation({ address: "123 Example St", parking: "yes" });

      expect(mockPrisma.location.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parking: false }),
        }),
      );
    });
  });

  describe("PATCH /[locationId]", () => {
    function patchLocation(body: unknown) {
      return PATCH(
        createJsonRequest({
          url: `${BASE_URL}/${LOCATION_ID}`,
          method: "PATCH",
          body,
        }),
        locationContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchLocation({ address: "456 Main St" });

      expect(response.status).toBe(401);
      expect(mockPrisma.location.update).not.toHaveBeenCalled();
    });

    it("returns 400 when the address is sent empty", async () => {
      mockSuccessfulAuthentication();

      const response = await patchLocation({ address: "  " });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "A location address is required",
      });
    });

    it("returns 400 when a boolean field is not a boolean", async () => {
      mockSuccessfulAuthentication();

      const response = await patchLocation({ isActive: "false" });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "isActive must be a boolean",
      });
    });

    it("returns 400 when no supported fields are provided", async () => {
      mockSuccessfulAuthentication();

      const response = await patchLocation({ unknownField: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "No supported fields were provided",
      });

      expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the location is not found in the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue(null);

      const response = await patchLocation({ address: "456 Main St" });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This location does not exist in our records",
      });

      expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, businessId: BUSINESS_ID },
        select: { id: true },
      });

      expect(mockPrisma.location.update).not.toHaveBeenCalled();
    });

    it("returns 409 when another location in the business has the address", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({ id: LOCATION_ID });
      mockPrisma.location.update.mockRejectedValue(uniqueConstraintError());

      const response = await patchLocation({ address: "456 Main St" });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A location with this address already exists for this business",
      });
    });

    it("returns 500 when updating the location fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({ id: LOCATION_ID });
      mockPrisma.location.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchLocation({ address: "456 Main St" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update location",
      });
    });

    it("only updates the fields that were sent", async () => {
      const updatedLocation = { id: LOCATION_ID, address: "456 Main St" };

      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({ id: LOCATION_ID });
      mockPrisma.location.update.mockResolvedValue(updatedLocation);

      const response = await patchLocation({ address: " 456 Main St " });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedLocation);

      expect(mockPrisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID },
        data: { address: "456 Main St" },
        select: locationSelect,
      });
    });

    it("clears optional text fields sent as null or empty and updates booleans", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({ id: LOCATION_ID });
      mockPrisma.location.update.mockResolvedValue({ id: LOCATION_ID });

      const response = await patchLocation({
        zip: null,
        city: "",
        state: "WA",
        enableHours: true,
        isActive: false,
      });

      expect(response.status).toBe(200);

      expect(mockPrisma.location.update).toHaveBeenCalledWith({
        where: { id: LOCATION_ID },
        data: {
          zip: null,
          city: null,
          state: "WA",
          enableHours: true,
          isActive: false,
        },
        select: locationSelect,
      });
    });
  });

  describe("DELETE /[locationId]", () => {
    const PRIVATE_IMAGE = `businesses/${BUSINESS_ID}/items/image-item-123.webp`;
    const SHARED_IMAGE = `businesses/${BUSINESS_ID}/items/synced/group/image.webp`;

    function deleteLocation() {
      return DELETE(
        createJsonRequest({
          url: `${BASE_URL}/${LOCATION_ID}`,
          method: "DELETE",
        }),
        locationContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteLocation();

      expect(response.status).toBe(401);
      expect(mockPrisma.location.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location is not found in the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue(null);

      const response = await deleteLocation();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This location does not exist in our records",
      });

      expect(mockPrisma.location.delete).not.toHaveBeenCalled();
    });

    it("returns 500 when deleting the location fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        items: [{ imageKey: PRIVATE_IMAGE, originalImageKey: null }],
      });
      mockPrisma.location.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteLocation();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete location",
      });

      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("successfully deletes a location without item images", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        items: [{ imageKey: null, originalImageKey: null }],
      });

      const response = await deleteLocation();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Location deleted successfully",
      });

      expect(mockPrisma.location.delete).toHaveBeenCalledWith({
        where: { id: LOCATION_ID },
      });

      expect(mockPrisma.item.findMany).not.toHaveBeenCalled();
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("deletes the location's item images except ones still shared with other locations", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        items: [
          { imageKey: PRIVATE_IMAGE, originalImageKey: null },
          { imageKey: SHARED_IMAGE, originalImageKey: null },
        ],
      });
      mockPrisma.item.findMany.mockResolvedValue([
        { imageKey: SHARED_IMAGE, originalImageKey: null },
      ]);

      const response = await deleteLocation();

      expect(response.status).toBe(200);

      expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
        where: { id: LOCATION_ID, businessId: BUSINESS_ID },
        select: {
          id: true,
          items: { select: { imageKey: true, originalImageKey: true } },
        },
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { imageKey: { in: [PRIVATE_IMAGE, SHARED_IMAGE] } },
            { originalImageKey: { in: [PRIVATE_IMAGE, SHARED_IMAGE] } },
          ],
        },
        select: { imageKey: true, originalImageKey: true },
      });

      expect(mockedDeleteObject).toHaveBeenCalledTimes(1);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
    });

    it("still succeeds when S3 image cleanup fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findFirst.mockResolvedValue({
        id: LOCATION_ID,
        items: [{ imageKey: PRIVATE_IMAGE, originalImageKey: null }],
      });
      mockPrisma.item.findMany.mockResolvedValue([]);
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteLocation();

      expect(response.status).toBe(200);
    });
  });

  describe("GET /[locationId]/overview", () => {
    function getOverview() {
      return GET_OVERVIEW(
        createJsonRequest({
          url: `${BASE_URL}/${LOCATION_ID}/overview`,
          method: "GET",
        }),
        locationContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await getOverview();

      expect(response.status).toBe(401);
      expect(mockPrisma.location.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when the location is not found in the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue(null);

      const response = await getOverview();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "The location could not be found for the overview content",
      });

      expect(mockPrisma.location.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: LOCATION_ID, businessId: BUSINESS_ID },
        }),
      );
    });

    it("returns 500 when fetching the overview fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await getOverview();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to get dashboard overview page contents",
      });
    });

    it("returns the overview with days sorted Monday to Sunday and sync fields included", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.location.findUnique.mockResolvedValue({
        id: LOCATION_ID,
        days: [
          { id: "day-sun", dayOfWeek: "Sunday" },
          { id: "day-mon", dayOfWeek: "Monday" },
          { id: "day-wed", dayOfWeek: "Wednesday" },
        ],
        categories: [],
        items: [],
        contacts: [],
        socials: [],
      });

      const response = await getOverview();

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.days.map((day: { dayOfWeek: string }) => day.dayOfWeek)).toEqual([
        "Monday",
        "Wednesday",
        "Sunday",
      ]);

      const query = mockPrisma.location.findUnique.mock.calls[0][0];

      expect(query.select.days.select).toEqual(
        expect.objectContaining({ syncGroupId: true, isSynced: true }),
      );
      expect(query.select.categories).toEqual(
        expect.objectContaining({
          where: { parentId: null },
          orderBy: { order: "asc" },
        }),
      );
      expect(query.select.contacts.select).toEqual(
        expect.objectContaining({ syncGroupId: true, isSynced: true }),
      );
    });
  });
});
