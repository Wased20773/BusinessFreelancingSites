/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/locations/route";
import { PATCH, DELETE } from "@/app/api/admin/locations/[locationId]/route";

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

describe("/api/admin/locations", () => {
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
                url: "http://localhost/api/admin/locations",
                method: "POST",
                body: {
                    address: "123 Main St",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.location.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the location address is missing", async () => {
            mockSuccessfulAuthentication();

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations",
                method: "POST",
                body: {
                    city: "Portland",
                    state: "Oregon",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing location address",
            });

            expect(mockPrisma.location.create).not.toHaveBeenCalled();
        });

        it("returns 500 when creating the location fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations",
                method: "POST",
                body: {
                    address: "123 Main St",
                    zip: "97201",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
                    parking: true,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to create location",
            });

            expect(mockPrisma.location.create).toHaveBeenCalled();
        });

        it("successfully creates a location", async () => {
            const createdLocation = {
                id: "location-123",
                address: "123 Main St",
                zip: "97201",
                country: "United States",
                state: "Oregon",
                city: "Portland",
                parking: true,
                isActive: true,
                enableHours: false,
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.location.create.mockResolvedValue(
                createdLocation
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations",
                method: "POST",
                body: {
                    address: "123 Main St",
                    zip: "97201",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
                    parking: true,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual({
                ...createdLocation,
                createdAt: createdLocation.createdAt.toISOString(),
                updatedAt: createdLocation.updatedAt.toISOString(),
            });

            expect(mockPrisma.location.create).toHaveBeenCalledWith({
                data: {
                    businessId: "business-123",
                    address: "123 Main St",
                    zip: "97201",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
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
                    enableHours: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("PATCH /[locationId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "PATCH",
                body: {
                    address: "456 Main St",
                    city: "Portland",
                    parking: false,
                    isActive: true,
                    enableHours: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.location.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the location is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "PATCH",
                body: {
                    address: "456 Main St",
                    city: "Portland",
                    parking: false,
                    isActive: true,
                    enableHours: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location does not exist in our records",
            });

            expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.location.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the location fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.findFirst.mockResolvedValue({
                id: "location-123",
            });

            mockPrisma.location.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "PATCH",
                body: {
                    address: "456 Main St",
                    zip: "97202",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
                    parking: false,
                    isActive: true,
                    enableHours: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update location",
            });

            expect(mockPrisma.location.update).toHaveBeenCalled();
        });

        it("successfully updates the location", async () => {
            const updatedLocation = {
                id: "location-123",
                address: "456 Main St",
                zip: "97202",
                country: "United States",
                state: "Oregon",
                city: "Portland",
                parking: false,
                isActive: true,
                enableHours: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.location.findFirst.mockResolvedValue({
                id: "location-123",
            });

            mockPrisma.location.update.mockResolvedValue(updatedLocation);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "PATCH",
                body: {
                    address: "456 Main St",
                    zip: "97202",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
                    parking: false,
                    isActive: true,
                    enableHours: true,
                },
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedLocation,
                updatedAt: updatedLocation.updatedAt.toISOString(),
            });

            expect(mockPrisma.location.update).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                },
                data: {
                    address: "456 Main St",
                    zip: "97202",
                    country: "United States",
                    state: "Oregon",
                    city: "Portland",
                    parking: false,
                    isActive: true,
                    enableHours: true,
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
                    enableHours: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("DELETE /[locationId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.location.deleteMany).not.toHaveBeenCalled();
        });

        it("returns 404 when the location is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.deleteMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This location does not exist in our records",
            });

            expect(mockPrisma.location.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                    businessId: "business-123",
                },
            });
        });

        it("returns 500 when deleting the location fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.deleteMany.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete location",
            });

            expect(mockPrisma.location.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                    businessId: "business-123",
                },
            });
        });

        it("successfully deletes the location", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.location.deleteMany.mockResolvedValue({
                count: 1,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/locations/location-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                locationId: "location-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Location deleted successfully",
            });

            expect(mockPrisma.location.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "location-123",
                    businessId: "business-123",
                },
            });
        });
    });
});