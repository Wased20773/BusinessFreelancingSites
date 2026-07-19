/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/locations/[locationId]/days/route";
import { normalizeDayOfWeek } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    normalizeDayOfWeek: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedNormalizeDayOfWeek =
    jest.mocked(normalizeDayOfWeek);

describe("/api/admin/locations/[locationId]/days", () => {
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
                    "http://localhost/api/admin/locations/location-123/days",
                method: "POST",
                body: {
                    dayOfWeek: "Monday",
                    isClosed: false,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockedNormalizeDayOfWeek).not.toHaveBeenCalled();
            expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.locationDay.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the dayOfWeek is invalid", async () => {
            mockSuccessfulAuthentication();

            mockedNormalizeDayOfWeek.mockReturnValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days",
                method: "POST",
                body: {
                    dayOfWeek: "Funday",
                    isClosed: false,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Invalid dayOfWeek",
            });

            expect(mockedNormalizeDayOfWeek).toHaveBeenCalledWith(
                "Funday"
            );

            expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.locationDay.create).not.toHaveBeenCalled();
        });

        it("returns 404 when the location is not found", async () => {
            mockSuccessfulAuthentication();

            mockedNormalizeDayOfWeek.mockReturnValue("Monday" as never);

            mockPrisma.location.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days",
                method: "POST",
                body: {
                    dayOfWeek: "Monday",
                    isClosed: false,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location does not exist in our records",
            });

            expect(mockedNormalizeDayOfWeek).toHaveBeenCalledWith(
                "Monday"
            );

            expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.locationDay.create).not.toHaveBeenCalled();
        });

        it("returns 500 when creating the location day fails", async () => {
            mockSuccessfulAuthentication();

            mockedNormalizeDayOfWeek.mockReturnValue("Monday" as never);

            mockPrisma.location.findFirst.mockResolvedValue({
                id: "location-123",
            });

            mockPrisma.locationDay.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days",
                method: "POST",
                body: {
                    dayOfWeek: "Monday",
                    isClosed: false,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to create location day",
            });

            expect(mockPrisma.locationDay.create).toHaveBeenCalled();
        });

        it("successfully creates a location day", async () => {
            const createdDay = {
                id: "day-123",
                locationId: "location-123",
                dayOfWeek: "Monday",
                isClosed: false,
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockedNormalizeDayOfWeek.mockReturnValue("Monday" as never);

            mockPrisma.location.findFirst.mockResolvedValue({
                id: "location-123",
            });

            mockPrisma.locationDay.create.mockResolvedValue(
                createdDay
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/locations/location-123/days",
                method: "POST",
                body: {
                    dayOfWeek: "Monday",
                    isClosed: false,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await POST(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual({
                ...createdDay,
                createdAt: createdDay.createdAt.toISOString(),
                updatedAt: createdDay.updatedAt.toISOString(),
            });

            expect(mockPrisma.locationDay.create).toHaveBeenCalledWith({
                data: {
                    locationId: "location-123",
                    dayOfWeek: "Monday",
                    isClosed: false,
                },
                select: {
                    id: true,
                    locationId: true,
                    dayOfWeek: true,
                    isClosed: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });
    });
});