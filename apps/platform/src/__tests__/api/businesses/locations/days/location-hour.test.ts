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

import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/days/day-123/hours/hour-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  dayId: "day-123",
  hourId: "hour-123",
});

const hourLookupWhere = {
  id: "hour-123",
  OR: [
    { regularDayId: "day-123", regularDay: { locationId: LOCATION_ID } },
    { specialDayId: "day-123", specialDay: { locationId: LOCATION_ID } },
  ],
};

function existingHour(overrides: Record<string, unknown> = {}) {
  return {
    id: "hour-123",
    regularDayId: "day-123",
    specialDayId: null,
    openTime: "09:00",
    closeTime: "17:00",
    syncGroupId: null,
    isSynced: false,
    ...overrides,
  };
}

describe("/api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("PATCH", () => {
    function patchHour(body: unknown) {
      return PATCH(createJsonRequest({ url: URL, method: "PATCH", body }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchHour({ openTime: "10:00", isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.hour.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchHour({ openTime: "10:00", isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchHour({ openTime: "10:00" });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 404 when the location hour is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(null);

      const response = await patchHour({ openTime: "10:00", isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This location hour does not exist in our records",
      });

      expect(mockPrisma.hour.findFirst).toHaveBeenCalledWith({
        where: hourLookupWhere,
        select: {
          id: true,
          regularDayId: true,
          specialDayId: true,
          openTime: true,
          closeTime: true,
          syncGroupId: true,
          isSynced: true,
        },
      });
    });

    it("returns 400 when an updated time is not in HH:MM format", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(existingHour());

      const response = await patchHour({ closeTime: "5pm", isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Open and close time must use the HH:MM 24-hour format",
      });

      expect(mockPrisma.hour.update).not.toHaveBeenCalled();
    });

    it("returns 400 when the updated open time is not earlier than the updated close time", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(existingHour());

      const response = await patchHour({ openTime: "18:00", isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Open time must be earlier than close time",
      });
    });

    it("returns 409 when the updated special time overlaps another special hour", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(
        existingHour({ regularDayId: null, specialDayId: "day-123" }),
      );
      mockPrisma.hour.findMany.mockResolvedValue([
        { openTime: "16:00", closeTime: "20:00" },
      ]);

      const response = await patchHour({ closeTime: "18:00", isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "The selected time conflicts with the existing special hours 16:00 - 20:00",
      });

      expect(mockPrisma.hour.findMany).toHaveBeenCalledWith({
        where: { specialDayId: "day-123", id: { not: "hour-123" } },
        select: { openTime: true, closeTime: true },
      });
    });

    it("returns 500 when updating the location hour fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(existingHour());
      mockPrisma.hour.update.mockRejectedValue(new Error("Database update failed"));

      const response = await patchHour({ openTime: "10:00", isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update location hours",
      });
    });

    it("successfully updates only the open time while preserving the existing close time", async () => {
      const updatedHour = { id: "hour-123", openTime: "10:00", closeTime: "17:00" };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(existingHour());
      mockPrisma.hour.update.mockResolvedValue(updatedHour);

      const response = await patchHour({ openTime: "10:00", isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedHour);

      expect(mockPrisma.hour.update).toHaveBeenCalledWith({
        where: { id: "hour-123" },
        data: {
          openTime: "10:00",
          closeTime: "17:00",
          title: undefined,
          note: undefined,
          isDisabled: undefined,
          isSynced: false,
        },
        select: {
          id: true,
          regularDayId: true,
          specialDayId: true,
          openTime: true,
          closeTime: true,
          title: true,
          note: true,
          isDisabled: true,
          syncGroupId: true,
          isSynced: true,
          updatedAt: true,
        },
      });

      // Regular hours do not need an overlap check.
      expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
    });

    it("updates only this hour when it has no sync group, even if isSynced is true", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(existingHour());
      mockPrisma.hour.update.mockResolvedValue({ id: "hour-123" });

      const response = await patchHour({ isDisabled: true, isSynced: true });

      expect(response.status).toBe(200);
      expect(mockPrisma.hour.update).toHaveBeenCalled();
      expect(mockPrisma.hour.updateMany).not.toHaveBeenCalled();
    });

    it("returns 409 when a synchronized special hour would overlap on another day", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(
        existingHour({
          regularDayId: null,
          specialDayId: "day-123",
          syncGroupId: "hour-sync-group",
        }),
      );
      mockPrisma.hour.findMany
        .mockResolvedValueOnce([
          { id: "hour-123", specialDayId: "day-123" },
          { id: "hour-456", specialDayId: "day-456" },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ openTime: "08:00", closeTime: "09:30" }]);

      const response = await patchHour({ openTime: "08:30", isSynced: true });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "The selected time conflicts with existing special hours 08:00 - 09:30",
      });

      expect(mockPrisma.hour.updateMany).not.toHaveBeenCalled();
    });

    it("successfully updates every synchronized hour in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(
        existingHour({ syncGroupId: "hour-sync-group", isSynced: true }),
      );
      mockPrisma.hour.findMany.mockResolvedValue([
        { id: "hour-123", specialDayId: null },
        { id: "hour-456", specialDayId: null },
      ]);
      mockPrisma.hour.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchHour({
        openTime: "8:00",
        title: "Breakfast",
        isSynced: true,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized hours updated successfully",
      });

      expect(mockPrisma.hour.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "hour-sync-group",
          OR: [{ isSynced: true }, { id: "hour-123" }],
        },
        data: {
          openTime: "08:00",
          closeTime: "17:00",
          title: "Breakfast",
          note: undefined,
          isDisabled: undefined,
          isSynced: true,
        },
      });

      expect(mockPrisma.hour.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    function deleteHour(body: unknown) {
      return DELETE(createJsonRequest({ url: URL, method: "DELETE", body }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteHour({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.hour.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteHour({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteHour({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the location hour is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue(null);

      const response = await deleteHour({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This location hour does not exist in our records",
      });

      expect(mockPrisma.hour.findFirst).toHaveBeenCalledWith({
        where: hourLookupWhere,
        select: { id: true, syncGroupId: true },
      });
    });

    it("returns 500 when deleting the location hour fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue({
        id: "hour-123",
        syncGroupId: null,
      });
      mockPrisma.hour.delete.mockRejectedValue(new Error("Database delete failed"));

      const response = await deleteHour({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete location hour",
      });
    });

    it("successfully deletes only the selected location hour", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue({
        id: "hour-123",
        syncGroupId: "hour-sync-group",
      });

      const response = await deleteHour({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Location hour deleted successfully",
      });

      expect(mockPrisma.hour.delete).toHaveBeenCalledWith({
        where: { id: "hour-123" },
      });

      expect(mockPrisma.hour.deleteMany).not.toHaveBeenCalled();
    });

    it("successfully deletes every synchronized hour in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.hour.findFirst.mockResolvedValue({
        id: "hour-123",
        syncGroupId: "hour-sync-group",
      });
      mockPrisma.hour.deleteMany.mockResolvedValue({ count: 3 });

      const response = await deleteHour({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized hours deleted successfully",
        count: 3,
      });

      expect(mockPrisma.hour.deleteMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "hour-sync-group",
          OR: [{ isSynced: true }, { id: "hour-123" }],
        },
      });

      expect(mockPrisma.hour.delete).not.toHaveBeenCalled();
    });
  });
});
