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
  POST,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/days/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/days`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function fullWeek(closedDays: string[] = ["Sunday"]) {
  return WEEK.map((dayOfWeek) => ({
    dayOfWeek: dayOfWeek.toLowerCase(),
    isClosed: closedDays.includes(dayOfWeek),
  }));
}

function postDays(body: unknown) {
  return POST(createJsonRequest({ url: URL, method: "POST", body }), context);
}

describe("/api/businesses/[businessId]/locations/[locationId]/days", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postDays({ days: fullWeek() });

      expect(response.status).toBe(401);
      expect(mockPrisma.locationDay.createMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postDays({ days: fullWeek() });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it.each([
      ["missing", undefined],
      ["not an array", "Monday"],
      ["fewer than 7 days", fullWeek().slice(0, 6)],
    ])("returns 400 when days is %s", async (_label, days) => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postDays({ days });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "All 7 days of the week must be provided",
      });
    });

    it("returns 400 when a day is missing its dayOfWeek", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const days = fullWeek();
      days[3] = null as never;

      const response = await postDays({ days });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Each day must include a day of the week",
      });
    });

    it("returns 400 when the dayOfWeek is invalid", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const days = fullWeek();
      days[0] = { dayOfWeek: "Funday", isClosed: false };

      const response = await postDays({ days });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Invalid day of the week: Funday",
      });
    });

    it("returns 400 when a day of the week is repeated", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const days = fullWeek();
      days[6] = { dayOfWeek: "monday", isClosed: false };

      const response = await postDays({ days });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Each day of the week must be provided exactly once",
      });
    });

    it("returns 409 when the location already has a schedule", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue({ id: "day-123" });

      const response = await postDays({ days: fullWeek() });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This location already has a schedule. Remove it before creating a new one",
      });

      expect(mockPrisma.locationDay.findFirst).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID },
        select: { id: true },
      });

      expect(mockPrisma.locationDay.createMany).not.toHaveBeenCalled();
    });

    it("returns 500 when creating the location days fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(null);
      mockPrisma.locationDay.createMany.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postDays({ days: fullWeek() });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create location days",
      });
    });

    it("successfully creates the weekly schedule for the selected location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(null);
      mockPrisma.locationDay.createMany.mockResolvedValue({ count: 7 });

      const response = await postDays({ days: fullWeek(), isSynced: false });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Location days created successfully",
        count: 7,
      });

      expect(mockPrisma.locationDay.createMany).toHaveBeenCalledWith({
        data: WEEK.map((dayOfWeek) => ({
          locationId: LOCATION_ID,
          dayOfWeek,
          isClosed: dayOfWeek === "Sunday",
          syncGroupId: null,
          isSynced: false,
        })),
      });

      expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
    });

    it("defaults isClosed to false when it is not a boolean", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(null);
      mockPrisma.locationDay.createMany.mockResolvedValue({ count: 7 });

      await postDays({
        days: WEEK.map((dayOfWeek) => ({ dayOfWeek, isClosed: "yes" })),
      });

      const { data } = mockPrisma.locationDay.createMany.mock.calls[0][0];

      expect(data.every((day: { isClosed: boolean }) => day.isClosed === false)).toBe(
        true,
      );
    });

    it("successfully creates a synchronized schedule with one sync group per weekday", async () => {
      const uuid = jest.spyOn(crypto, "randomUUID");

      WEEK.forEach((dayOfWeek) => {
        uuid.mockReturnValueOnce(
          `sync-${dayOfWeek}` as ReturnType<Crypto["randomUUID"]>,
        );
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(null);
      mockPrisma.location.findMany.mockResolvedValue([
        { id: LOCATION_ID },
        { id: "location-456" },
      ]);
      mockPrisma.locationDay.createMany.mockResolvedValue({ count: 14 });

      const response = await postDays({ days: fullWeek(), isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized location days created successfully",
        count: 14,
      });

      expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID, days: { none: {} } },
        select: { id: true },
      });

      expect(mockPrisma.locationDay.createMany).toHaveBeenCalledWith({
        data: [LOCATION_ID, "location-456"].flatMap((locationId) =>
          WEEK.map((dayOfWeek) => ({
            locationId,
            dayOfWeek,
            isClosed: dayOfWeek === "Sunday",
            isSynced: true,
            syncGroupId: `sync-${dayOfWeek}`,
          })),
        ),
      });
    });
  });

  describe("DELETE", () => {
    function deleteDays() {
      return DELETE(createJsonRequest({ url: URL, method: "DELETE" }), context);
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteDays();

      expect(response.status).toBe(401);
      expect(mockPrisma.locationDay.deleteMany).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteDays();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);

      expect(mockPrisma.locationDay.deleteMany).not.toHaveBeenCalled();
    });

    it("returns 500 when deleting the location days fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.deleteMany.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteDays();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to remove location days",
      });
    });

    it("successfully deletes the schedule for only the selected location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.deleteMany.mockResolvedValue({ count: 7 });

      const response = await deleteDays();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Location days removed successfully",
        count: 7,
      });

      expect(mockPrisma.locationDay.deleteMany).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID },
      });
    });
  });
});
