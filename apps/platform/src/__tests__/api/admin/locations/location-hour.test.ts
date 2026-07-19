/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import {
    DELETE,
    PATCH,
} from "@/app/api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]/route";
import {
    checkTimeOverlap,
    timeToMinutes,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    timeToMinutes: jest.fn(),
    checkTimeOverlap: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedTimeToMinutes =
    jest.mocked(timeToMinutes);

const mockedCheckTimeOverlap =
    jest.mocked(checkTimeOverlap);

describe(
    "/api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]",
    () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe("PATCH", () => {
            it("returns the authentication error response", async () => {
                mockedAuthenticateBusinessAccess.mockResolvedValue(
                    NextResponse.json(
                        { error: "Unauthorized Access" },
                        { status: 401 }
                    )
                );

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "09:00",
                        closeTime: "17:00",
                        title: "Regular Hours",
                        note: "Main shift",
                        isDisabled: false,
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(
                    request,
                    context
                );

                const responseBody =
                    await response.json();

                expect(response.status).toBe(401);

                expect(responseBody).toEqual({
                    error: "Unauthorized Access",
                });

                expect(
                    mockPrisma.hour.findFirst
                ).not.toHaveBeenCalled();

                expect(
                    mockedTimeToMinutes
                ).not.toHaveBeenCalled();

                expect(
                    mockPrisma.hour.findMany
                ).not.toHaveBeenCalled();

                expect(
                    mockedCheckTimeOverlap
                ).not.toHaveBeenCalled();

                expect(
                    mockPrisma.hour.update
                ).not.toHaveBeenCalled();
            });

            it("returns 404 when the location hour is not found", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.findFirst.mockResolvedValue(null);

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "09:00",
                        closeTime: "17:00",
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(404);

                expect(responseBody).toEqual({
                    error: "This location hour does not exist in our records",
                });

                expect(mockPrisma.hour.findFirst).toHaveBeenCalledWith({
                    where: {
                        id: "hour-123",
                        locationDayId: "day-123",
                        locationDay: {
                            locationId: "location-123",
                            location: {
                                businessId: "business-123",
                            },
                        },
                    },
                    select: {
                        id: true,
                        openTime: true,
                        closeTime: true,
                    },
                });

                expect(mockedTimeToMinutes).not.toHaveBeenCalled();
                expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
                expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
                expect(mockPrisma.hour.update).not.toHaveBeenCalled();
            });

            it("returns 400 when the updated open time is not earlier than the updated close time", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.findFirst.mockResolvedValue({
                    id: "hour-123",
                    openTime: "09:00",
                    closeTime: "17:00",
                });

                mockedTimeToMinutes
                    .mockReturnValueOnce(1080) // 18:00
                    .mockReturnValueOnce(1020); // 17:00

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "18:00",
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(400);

                expect(responseBody).toEqual({
                    error: "Open time must be earlier than close time",
                });

                expect(mockedTimeToMinutes).toHaveBeenNthCalledWith(
                    1,
                    "18:00"
                );

                expect(mockedTimeToMinutes).toHaveBeenNthCalledWith(
                    2,
                    "17:00"
                );

                expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
                expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
                expect(mockPrisma.hour.update).not.toHaveBeenCalled();
            });

            it("returns 409 when the updated time overlaps another hour", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.findFirst.mockResolvedValue({
                    id: "hour-123",
                    openTime: "09:00",
                    closeTime: "17:00",
                });

                mockedTimeToMinutes
                    .mockReturnValueOnce(600)
                    .mockReturnValueOnce(1020);

                mockPrisma.hour.findMany.mockResolvedValue([
                    {
                        id: "hour-456",
                        openTime: "08:00",
                        closeTime: "11:00",
                    },
                    {
                        id: "hour-789",
                        openTime: "18:00",
                        closeTime: "21:00",
                    },
                ]);

                mockedCheckTimeOverlap.mockReturnValueOnce(true);

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "10:00",
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(409);

                expect(responseBody).toEqual({
                    error:
                        "The selected time conflicts with the existing hours 08:00 - 11:00",
                });

                expect(mockPrisma.hour.findMany).toHaveBeenCalledWith({
                    where: {
                        locationDayId: "day-123",
                        id: {
                            not: "hour-123",
                        },
                    },
                    select: {
                        id: true,
                        openTime: true,
                        closeTime: true,
                    },
                });

                expect(mockedCheckTimeOverlap).toHaveBeenCalledWith(
                    "10:00",
                    "17:00",
                    "08:00",
                    "11:00"
                );

                expect(mockPrisma.hour.update).not.toHaveBeenCalled();
            });

            it("returns 500 when updating the location hour fails", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.findFirst.mockResolvedValue({
                    id: "hour-123",
                    openTime: "09:00",
                    closeTime: "17:00",
                });

                mockedTimeToMinutes
                    .mockReturnValueOnce(540)
                    .mockReturnValueOnce(1020);

                mockPrisma.hour.findMany.mockResolvedValue([]);

                mockPrisma.hour.update.mockRejectedValue(
                    new Error("Database update failed")
                );

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "09:00",
                        closeTime: "17:00",
                        title: "Regular Hours",
                        note: "Main shift",
                        isDisabled: false,
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(500);

                expect(responseBody).toEqual({
                    error: "Failed to update location hours",
                });

                expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
                expect(mockPrisma.hour.update).toHaveBeenCalled();
            });

            it("successfully updates only the open time while preserving the existing close time", async () => {
                const updatedHour = {
                    id: "hour-123",
                    locationDayId: "day-123",
                    openTime: "10:00",
                    closeTime: "17:00",
                    title: "Updated Hours",
                    note: "Later opening",
                    isDisabled: false,
                    updatedAt: new Date("2026-07-17T12:00:00.000Z"),
                };

                mockSuccessfulAuthentication();

                mockPrisma.hour.findFirst.mockResolvedValue({
                    id: "hour-123",
                    openTime: "09:00",
                    closeTime: "17:00",
                });

                mockedTimeToMinutes
                    .mockReturnValueOnce(600)
                    .mockReturnValueOnce(1020);

                mockPrisma.hour.findMany.mockResolvedValue([
                    {
                        id: "hour-456",
                        openTime: "18:00",
                        closeTime: "21:00",
                    },
                ]);

                mockedCheckTimeOverlap.mockReturnValue(false);

                mockPrisma.hour.update.mockResolvedValue(updatedHour);

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "PATCH",
                    body: {
                        openTime: "10:00",
                        title: "Updated Hours",
                        note: "Later opening",
                        isDisabled: false,
                    },
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await PATCH(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(200);

                expect(responseBody).toEqual({
                    ...updatedHour,
                    updatedAt: updatedHour.updatedAt.toISOString(),
                });

                expect(mockedCheckTimeOverlap).toHaveBeenCalledWith(
                    "10:00",
                    "17:00",
                    "18:00",
                    "21:00"
                );

                expect(mockPrisma.hour.update).toHaveBeenCalledWith({
                    where: {
                        id: "hour-123",
                    },
                    data: {
                        openTime: "10:00",
                        closeTime: "17:00",
                        title: "Updated Hours",
                        note: "Later opening",
                        isDisabled: false,
                    },
                    select: {
                        id: true,
                        locationDayId: true,
                        openTime: true,
                        closeTime: true,
                        title: true,
                        note: true,
                        isDisabled: true,
                        updatedAt: true,
                    },
                });
            });
        });

        describe("DELETE", () => {
            it("returns the authentication error response", async () => {
                mockedAuthenticateBusinessAccess.mockResolvedValue(
                    NextResponse.json(
                        { error: "Unauthorized Access" },
                        { status: 401 }
                    )
                );

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "DELETE",
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await DELETE(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(401);

                expect(responseBody).toEqual({
                    error: "Unauthorized Access",
                });

                expect(mockPrisma.hour.deleteMany).not.toHaveBeenCalled();
            });

            it("returns 404 when the location hour is not found", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.deleteMany.mockResolvedValue({
                    count: 0,
                });

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "DELETE",
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await DELETE(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(404);

                expect(responseBody).toEqual({
                    error: "This location hour does not exist in our records",
                });

                expect(mockPrisma.hour.deleteMany).toHaveBeenCalledWith({
                    where: {
                        id: "hour-123",
                        locationDayId: "day-123",
                        locationDay: {
                            locationId: "location-123",
                            location: {
                                businessId: "business-123",
                            },
                        },
                    },
                });
            });

            it("returns 500 when deleting the location hour fails", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.deleteMany.mockRejectedValue(
                    new Error("Database delete failed")
                );

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "DELETE",
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await DELETE(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(500);

                expect(responseBody).toEqual({
                    error: "Failed to delete location hour",
                });

                expect(mockPrisma.hour.deleteMany).toHaveBeenCalledWith({
                    where: {
                        id: "hour-123",
                        locationDayId: "day-123",
                        locationDay: {
                            locationId: "location-123",
                            location: {
                                businessId: "business-123",
                            },
                        },
                    },
                });
            });

            it("successfully deletes the location hour", async () => {
                mockSuccessfulAuthentication();

                mockPrisma.hour.deleteMany.mockResolvedValue({
                    count: 1,
                });

                const request = createJsonRequest({
                    url:
                        "http://localhost/api/admin/locations/location-123/days/day-123/hours/hour-123",
                    method: "DELETE",
                });

                const context = createRouteContext({
                    locationId: "location-123",
                    dayId: "day-123",
                    hourId: "hour-123",
                });

                const response = await DELETE(request, context);
                const responseBody = await response.json();

                expect(response.status).toBe(200);

                expect(responseBody).toEqual({
                    message: "Location hour deleted successfully",
                });

                expect(mockPrisma.hour.deleteMany).toHaveBeenCalledWith({
                    where: {
                        id: "hour-123",
                        locationDayId: "day-123",
                        locationDay: {
                            locationId: "location-123",
                            location: {
                                businessId: "business-123",
                            },
                        },
                    },
                });
            });
        });
    }
);