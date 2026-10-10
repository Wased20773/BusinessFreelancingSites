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

import { PATCH } from "@/app/api/businesses/[businessId]/locations/[locationId]/days/[dayId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/days/day-123`;

const daySelect = {
  id: true,
  locationId: true,
  dayOfWeek: true,
  isClosed: true,
  syncGroupId: true,
  isSynced: true,
  updatedAt: true,
};

function patchDay(body: unknown, dayId = "day-123") {
  return PATCH(
    createJsonRequest({ url: URL, method: "PATCH", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      dayId,
    }),
  );
}

describe("PATCH /api/businesses/[businessId]/locations/[locationId]/days/[dayId]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await patchDay({ isClosed: true, isSynced: false });

    expect(response.status).toBe(401);
    expect(mockPrisma.locationDay.update).not.toHaveBeenCalled();
  });

  it("returns 400 when dayId is missing", async () => {
    const response = await patchDay({ isClosed: true, isSynced: false }, "");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing dayId" });
  });

  it("returns 404 when the location does not belong to the business", async () => {
    mockSuccessfulAuthentication();
    mockLocationNotInBusiness();

    const response = await patchDay({ isClosed: true, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
  });

  it("returns 400 when the closed setting is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await patchDay({ isSynced: false });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Closed setting was not found",
    });
  });

  it("returns 400 when the synchronization setting is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await patchDay({ isClosed: true });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });
  });

  it("returns 404 when the location day is not found", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue(null);

    const response = await patchDay({ isClosed: true, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "This day does not exist in our records",
    });

    expect(mockPrisma.locationDay.findFirst).toHaveBeenCalledWith({
      where: { id: "day-123", locationId: LOCATION_ID },
      select: daySelect,
    });
  });

  it("returns 500 when updating the location day fails", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue({
      id: "day-123",
      syncGroupId: null,
    });
    mockPrisma.locationDay.update.mockRejectedValue(
      new Error("Database update failed"),
    );

    const response = await patchDay({ isClosed: true, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to update location day",
    });
  });

  it("successfully updates only the selected location day", async () => {
    const updatedDay = {
      id: "day-123",
      locationId: LOCATION_ID,
      dayOfWeek: "Monday",
      isClosed: true,
      syncGroupId: "sync-Monday",
      isSynced: false,
    };

    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst.mockResolvedValue({
      id: "day-123",
      syncGroupId: "sync-Monday",
    });
    mockPrisma.locationDay.update.mockResolvedValue(updatedDay);

    const response = await patchDay({ isClosed: true, isSynced: false });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updatedDay);

    expect(mockPrisma.locationDay.update).toHaveBeenCalledWith({
      where: { id: "day-123", locationId: LOCATION_ID },
      data: { isClosed: true, isSynced: false },
      select: daySelect,
    });

    expect(mockPrisma.locationDay.updateMany).not.toHaveBeenCalled();
  });

  it("successfully updates the same weekday at every synchronized location", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.locationDay.findFirst
      .mockResolvedValueOnce({ id: "day-123", syncGroupId: "sync-Monday" })
      .mockResolvedValueOnce({ id: "day-123", isClosed: true });
    mockPrisma.locationDay.updateMany.mockResolvedValue({ count: 2 });

    const response = await patchDay({ isClosed: true, isSynced: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Synchronized day's updated successfully",
      id: "day-123",
      isClosed: true,
    });

    expect(mockPrisma.locationDay.updateMany).toHaveBeenCalledWith({
      where: {
        syncGroupId: "sync-Monday",
        OR: [{ isSynced: true }, { id: "day-123" }],
      },
      data: { isClosed: true, isSynced: true },
    });
  });
});
