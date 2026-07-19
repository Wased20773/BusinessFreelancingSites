/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/locations/[locationId]/days/[dayId]/hours/route";
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

describe("/api/admin/locations/[locationId]/days/[dayId]/hours", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "09:00",
                    closeTime: "17:00",
                    title: "Regular Hours",
                    note: "Main shift",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockedTimeToMinutes).not.toHaveBeenCalled();
            expect(mockPrisma.locationDay.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
            expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
            expect(mockPrisma.hour.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the open time is not earlier than the close time", async () => {
            mockSuccessfulAuthentication();

            mockedTimeToMinutes
                .mockReturnValueOnce(600) // 10:00
                .mockReturnValueOnce(600); // 10:00

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "10:00",
                    closeTime: "10:00",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Open time must be earlier than close time",
            });

            expect(mockedTimeToMinutes).toHaveBeenNthCalledWith(
                1,
                "10:00"
            );

            expect(mockedTimeToMinutes).toHaveBeenNthCalledWith(
                2,
                "10:00"
            );

            expect(mockPrisma.locationDay.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
            expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
            expect(mockPrisma.hour.create).not.toHaveBeenCalled();
        });

        it("returns 404 when the location day is not found", async () => {
            mockSuccessfulAuthentication();

            mockedTimeToMinutes
                .mockReturnValueOnce(540)  // 09:00
                .mockReturnValueOnce(1020); // 17:00

            mockPrisma.locationDay.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "09:00",
                    closeTime: "17:00",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location day does not exist in our records",
            });

            expect(mockPrisma.locationDay.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.hour.findMany).not.toHaveBeenCalled();
            expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
            expect(mockPrisma.hour.create).not.toHaveBeenCalled();
        });

        it("returns 409 when the selected time overlaps existing hours", async () => {
            mockSuccessfulAuthentication();

            mockedTimeToMinutes
                .mockReturnValueOnce(600)  // 10:00
                .mockReturnValueOnce(840); // 14:00

            mockPrisma.locationDay.findFirst.mockResolvedValue({
                id: "day-123",
            });

            mockPrisma.hour.findMany.mockResolvedValue([
                {
                    id: "hour-123",
                    openTime: "09:00",
                    closeTime: "12:00",
                },
                {
                    id: "hour-456",
                    openTime: "15:00",
                    closeTime: "18:00",
                },
            ]);

            mockedCheckTimeOverlap
                .mockReturnValueOnce(true);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "10:00",
                    closeTime: "14:00",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(409);

            expect(responseBody).toEqual({
                error:
                    "The selected time conflicts with the existing hours 09:00 - 12:00",
            });

            expect(mockPrisma.hour.findMany).toHaveBeenCalledWith({
                where: {
                    locationDayId: "day-123",
                },
                select: {
                    id: true,
                    openTime: true,
                    closeTime: true,
                },
            });

            expect(mockedCheckTimeOverlap).toHaveBeenCalledWith(
                "10:00",
                "14:00",
                "09:00",
                "12:00"
            );

            expect(mockPrisma.hour.create).not.toHaveBeenCalled();
        });

        it("returns 500 when creating the location hours fails", async () => {
            mockSuccessfulAuthentication();

            mockedTimeToMinutes
                .mockReturnValueOnce(540)
                .mockReturnValueOnce(1020);

            mockPrisma.locationDay.findFirst.mockResolvedValue({
                id: "day-123",
            });

            mockPrisma.hour.findMany.mockResolvedValue([]);

            mockPrisma.hour.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "09:00",
                    closeTime: "17:00",
                    title: "Regular Hours",
                    note: "Main shift",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to create location hours",
            });

            expect(mockedCheckTimeOverlap).not.toHaveBeenCalled();
            expect(mockPrisma.hour.create).toHaveBeenCalled();
        });

        it("successfully creates location hours", async () => {
            const createdHour = {
                id: "hour-123",
                locationDayId: "day-123",
                openTime: "09:00",
                closeTime: "17:00",
                title: "Regular Hours",
                note: "Main shift",
                isDisabled: false,
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockedTimeToMinutes
                .mockReturnValueOnce(540)
                .mockReturnValueOnce(1020);

            mockPrisma.locationDay.findFirst.mockResolvedValue({
                id: "day-123",
            });

            mockPrisma.hour.findMany.mockResolvedValue([
                {
                    id: "hour-456",
                    openTime: "18:00",
                    closeTime: "21:00",
                },
            ]);

            mockedCheckTimeOverlap.mockReturnValue(false);

            mockPrisma.hour.create.mockResolvedValue(createdHour);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123/hours",
                method: "POST",
                body: {
                    openTime: "09:00",
                    closeTime: "17:00",
                    title: "Regular Hours",
                    note: "Main shift",
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual({
                ...createdHour,
                createdAt: createdHour.createdAt.toISOString(),
                updatedAt: createdHour.updatedAt.toISOString(),
            });

            expect(mockedCheckTimeOverlap).toHaveBeenCalledWith(
                "09:00",
                "17:00",
                "18:00",
                "21:00"
            );

            expect(mockPrisma.hour.create).toHaveBeenCalledWith({
                data: {
                    locationDayId: "day-123",
                    openTime: "09:00",
                    closeTime: "17:00",
                    title: "Regular Hours",
                    note: "Main shift",
                },
                select: {
                    id: true,
                    locationDayId: true,
                    openTime: true,
                    closeTime: true,
                    title: true,
                    note: true,
                    isDisabled: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });
    });
});