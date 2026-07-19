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
} from "@/app/api/admin/locations/[locationId]/days/[dayId]/route";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

describe("/api/admin/locations/[locationId]/days/[dayId]", () => {
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
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "PATCH",
                body: {
                    isClosed: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.locationDay.updateMany
            ).not.toHaveBeenCalled();

            expect(
                mockPrisma.locationDay.findUnique
            ).not.toHaveBeenCalled();
        });

        it("returns 404 when the location day is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.locationDay.updateMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "PATCH",
                body: {
                    isClosed: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location day does not exist in our records",
            });

            expect(mockPrisma.locationDay.updateMany).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
                data: {
                    isClosed: true,
                },
            });

            expect(
                mockPrisma.locationDay.findUnique
            ).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the location day fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.locationDay.updateMany.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "PATCH",
                body: {
                    isClosed: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update location day",
            });

            expect(mockPrisma.locationDay.updateMany).toHaveBeenCalled();
            expect(mockPrisma.locationDay.findUnique).not.toHaveBeenCalled();
        });

        it("successfully updates the location day", async () => {
            const updatedDay = {
                id: "day-123",
                locationId: "location-123",
                dayOfWeek: "Monday",
                isClosed: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.locationDay.updateMany.mockResolvedValue({
                count: 1,
            });

            mockPrisma.locationDay.findUnique.mockResolvedValue(
                updatedDay
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "PATCH",
                body: {
                    isClosed: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedDay,
                updatedAt: updatedDay.updatedAt.toISOString(),
            });

            expect(mockPrisma.locationDay.updateMany).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
                data: {
                    isClosed: true,
                },
            });

            expect(mockPrisma.locationDay.findUnique).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                },
                select: {
                    id: true,
                    locationId: true,
                    dayOfWeek: true,
                    isClosed: true,
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
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.locationDay.deleteMany
            ).not.toHaveBeenCalled();
        });

        it("returns 404 when the location day is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.locationDay.deleteMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location day does not exist in our records",
            });

            expect(mockPrisma.locationDay.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
            });
        });

        it("returns 500 when deleting the location day fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.locationDay.deleteMany.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete location day",
            });

            expect(mockPrisma.locationDay.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
            });
        });

        it("successfully deletes the location day", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.locationDay.deleteMany.mockResolvedValue({
                count: 1,
            });

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days/day-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
                dayId: "day-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Location day deleted successfully",
            });

            expect(mockPrisma.locationDay.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "day-123",
                    locationId: "location-123",
                    location: {
                        businessId: "business-123",
                    },
                },
            });
        });
    });
});