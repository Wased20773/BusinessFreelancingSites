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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/days/day-123/hours`;

const hourBody = {
  openTime: "16:00",
  closeTime: "20:00",
  title: "Happy Hour",
  note: "Serving special dishes!",
};

const hourSelect = {
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
  createdAt: true,
  updatedAt: true,
};

function locationDay(overrides: Record<string, unknown> = {}) {
  return {
    id: "day-123",
    syncGroupId: null,
    hour: null,
    specialHours: [],
    ...overrides,
  };
}

function postHour(body: unknown) {
  return POST(
    createJsonRequest({ url: URL, method: "POST", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      dayId: "day-123",
    }),
  );
}

describe("POST /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await postHour({ ...hourBody, isSpecial: false, isSynced: false });

    expect(response.status).toBe(401);
    expect(mockPrisma.hour.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the location does not belong to the business", async () => {
    mockSuccessfulAuthentication();
    mockLocationNotInBusiness();

    const response = await postHour({ ...hourBody, isSpecial: false, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
  });

  it("returns 400 when the open or close time is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postHour({
      openTime: "16:00",
      isSpecial: false,
      isSynced: false,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Both open and close time must be provided",
    });
  });

  it.each(["noon", "24:00", "9:75"])(
    'returns 400 when a time is not in HH:MM format ("%s")',
    async (openTime) => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postHour({
        ...hourBody,
        openTime,
        isSpecial: false,
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Open and close time must use the HH:MM 24-hour format",
      });

      expect(mockPrisma.locationDay.findFirst).not.toHaveBeenCalled();
    },
  );

  it("returns 400 when the hour type is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postHour({ ...hourBody, isSynced: false });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Hour type must be provided" });
  });

  it("returns 400 when the synchronization setting is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postHour({ ...hourBody, isSpecial: false });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });
  });

  it("returns 400 when the open time is not earlier than the close time", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postHour({
      ...hourBody,
      openTime: "20:00",
      closeTime: "16:00",
      isSpecial: false,
      isSynced: false,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Open time must be earlier than close time",
    });
  });

  it("returns 404 when the location day is not found", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(null);

    const response = await postHour({ ...hourBody, isSpecial: false, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "This location day does not exist in our records",
    });

    expect(mockPrisma.locationDay.findFirst).toHaveBeenCalledWith({
      where: { id: "day-123", locationId: LOCATION_ID },
      select: {
        id: true,
        syncGroupId: true,
        hour: { select: { id: true } },
        specialHours: {
          select: { id: true, openTime: true, closeTime: true },
        },
      },
    });
  });

  it("returns 409 when the day already has regular hours", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(
      locationDay({ hour: { id: "hour-existing" } }),
    );

    const response = await postHour({ ...hourBody, isSpecial: false, isSynced: false });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Regular hours already exist for this day",
    });

    expect(mockPrisma.hour.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the selected special time overlaps existing special hours", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(
      locationDay({
        specialHours: [{ id: "hour-1", openTime: "18:00", closeTime: "22:00" }],
      }),
    );

    const response = await postHour({ ...hourBody, isSpecial: true, isSynced: false });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "The selected time conflicts with the existing hours 18:00 - 22:00",
    });
  });

  it("returns 500 when creating the location hours fails", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(locationDay());
    mockPrisma.hour.create.mockRejectedValue(new Error("Database create failed"));

    const response = await postHour({ ...hourBody, isSpecial: false, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to create location hours",
    });
  });

  it("successfully creates regular hours and normalizes the times", async () => {
    const createdHour = {
      id: "hour-123",
      regularDayId: "day-123",
      specialDayId: null,
      openTime: "09:00",
      closeTime: "17:00",
    };

    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(locationDay());
    mockPrisma.hour.create.mockResolvedValue(createdHour);

    const response = await postHour({
      ...hourBody,
      openTime: "9:00",
      closeTime: "17:00",
      isSpecial: false,
      isSynced: false,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(createdHour);

    expect(mockPrisma.hour.create).toHaveBeenCalledWith({
      data: {
        regularDayId: "day-123",
        openTime: "09:00",
        closeTime: "17:00",
        title: hourBody.title,
        note: hourBody.note,
        syncGroupId: null,
        isSynced: false,
      },
      select: hourSelect,
    });
  });

  it("successfully creates special hours that touch but do not overlap existing ones", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(
      locationDay({
        specialHours: [{ id: "hour-1", openTime: "12:00", closeTime: "16:00" }],
      }),
    );
    mockPrisma.hour.create.mockResolvedValue({ id: "hour-123" });

    const response = await postHour({ ...hourBody, isSpecial: true, isSynced: false });

    expect(response.status).toBe(201);

    expect(mockPrisma.hour.create).toHaveBeenCalledWith({
      data: {
        specialDayId: "day-123",
        ...hourBody,
        syncGroupId: null,
        isSynced: false,
      },
      select: hourSelect,
    });
  });

  describe("synchronized", () => {
    it("returns 400 when the day does not belong to a sync group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(locationDay());

      const response = await postHour({ ...hourBody, isSpecial: false, isSynced: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This location day does not belong to a synchronization group",
      });
    });

    it("returns 409 when any synchronized day already has regular hours", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(
        locationDay({ syncGroupId: "sync-Monday" }),
      );
      mockPrisma.locationDay.findMany.mockResolvedValue([
        { id: "day-123", hour: null, specialHours: [] },
        { id: "day-456", hour: { id: "hour-existing" }, specialHours: [] },
      ]);

      const response = await postHour({ ...hourBody, isSpecial: false, isSynced: true });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "Regular hours already exist for one or more synchronized days",
      });

      expect(mockPrisma.hour.createMany).not.toHaveBeenCalled();
    });

    it("returns 409 when a special time overlaps on any synchronized day", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(
        locationDay({ syncGroupId: "sync-Monday" }),
      );
      mockPrisma.locationDay.findMany.mockResolvedValue([
        { id: "day-123", hour: null, specialHours: [] },
        {
          id: "day-456",
          hour: null,
          specialHours: [{ id: "hour-9", openTime: "15:00", closeTime: "17:00" }],
        },
      ]);

      const response = await postHour({ ...hourBody, isSpecial: true, isSynced: true });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "The selected time conflicts with existing special hours 15:00 - 17:00",
      });
    });

    it("successfully creates the hour on every synchronized day", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValue("hour-sync-group" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.locationDay.findFirst.mockResolvedValue(
        locationDay({ syncGroupId: "sync-Monday" }),
      );
      mockPrisma.locationDay.findMany.mockResolvedValue([
        { id: "day-123", hour: null, specialHours: [] },
        { id: "day-456", hour: null, specialHours: [] },
      ]);
      mockPrisma.hour.createMany.mockResolvedValue({ count: 2 });

      const response = await postHour({ ...hourBody, isSpecial: false, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized hours created successfully",
        count: 2,
        syncGroupId: "hour-sync-group",
      });

      expect(mockPrisma.locationDay.findMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-Monday",
          OR: [{ isSynced: true }, { id: "day-123" }],
        },
        select: {
          id: true,
          hour: { select: { id: true } },
          specialHours: {
            select: { id: true, openTime: true, closeTime: true },
          },
        },
      });

      expect(mockPrisma.hour.createMany).toHaveBeenCalledWith({
        data: ["day-123", "day-456"].map((dayId) => ({
          regularDayId: dayId,
          specialDayId: null,
          ...hourBody,
          syncGroupId: "hour-sync-group",
          isSynced: true,
        })),
      });
    });
  });
});
