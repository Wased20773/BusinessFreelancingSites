/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import {
    GET,
    PATCH,
} from "@/app/api/admin/account/route";
import {
    GET as searchAccount,
} from "@/app/api/admin/account/search/route";

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

describe("/api/admin/account", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = new Request(
                "http://localhost/api/admin/account",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.businessUser.findFirst
            ).not.toHaveBeenCalled();
        });

        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = new Request(
                "http://localhost/api/admin/account",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.businessUser.findFirst
            ).not.toHaveBeenCalled();
        });

        it("successfully returns the account details", async () => {
            const accountDetails = {
                id: "business-user-123",
                user: {
                    id: "user-123",
                    name: "Tester",
                    username: "tester",
                    email: "tester@example.com",
                    image: "https://example.com/profile.png",
                    createdAt: new Date("2026-07-17T12:00:00.000Z"),
                    updatedAt: new Date("2026-07-17T12:00:00.000Z"),
                },
                role: {
                    accessLevel: "admin",
                    description: "Business administrator",
                },
            };

            mockSuccessfulAuthentication();

            mockPrisma.businessUser.findFirst.mockResolvedValue(
                accountDetails
            );

            const request = new Request(
                "http://localhost/api/admin/account",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...accountDetails,
                user: {
                    ...accountDetails.user,
                    createdAt:
                        accountDetails.user.createdAt.toISOString(),
                    updatedAt:
                        accountDetails.user.updatedAt.toISOString(),
                },
            });

            expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                    userId: "user-123",
                },
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                            image: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                    role: {
                        select: {
                            accessLevel: true,
                            description: true,
                        },
                    },
                },
            });
        });
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
                url: "http://localhost/api/admin/account",
                method: "PATCH",
                body: {
                    name: "Tester",
                    username: "tester",
                },
            });

            const response = await PATCH(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.user.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the user profile fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/account",
                method: "PATCH",
                body: {
                    name: "Tester",
                    username: "tester",
                },
            });

            const response = await PATCH(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update user profile",
            });

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: {
                    id: "user-123",
                },
                data: {
                    name: "Tester",
                    username: "tester",
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    updatedAt: true,
                },
            });
        });

        it("successfully updates the user profile", async () => {
            const updatedUser = {
                id: "user-123",
                name: "Tester",
                username: "tester",
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.user.update.mockResolvedValue(updatedUser);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/account",
                method: "PATCH",
                body: {
                    name: "Tester",
                    username: "tester",
                },
            });

            const response = await PATCH(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedUser,
                updatedAt: updatedUser.updatedAt.toISOString(),
            });

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: {
                    id: "user-123",
                },
                data: {
                    name: "Tester",
                    username: "tester",
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("GET /search", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = new Request(
                "http://localhost/api/admin/account/search?email=user@example.com",
                {
                    method: "GET",
                }
            );

            const response = await searchAccount(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
        });

        it("returns 400 when the email query parameter is missing", async () => {
            mockSuccessfulAuthentication();

            const request = new Request(
                "http://localhost/api/admin/account/search",
                {
                    method: "GET",
                }
            );

            const response = await searchAccount(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing email",
            });

            expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
        });

        it("returns 404 when the searched user is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue(null);

            const request = new Request(
                "http://localhost/api/admin/account/search?email=missing@example.com",
                {
                    method: "GET",
                }
            );

            const response = await searchAccount(request);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "Searched user was not found",
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "missing@example.com",
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    createdAt: true,
                },
            });
        });

        it("returns 500 when searching for the account fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockRejectedValue(
                new Error("Database query failed")
            );

            const request = new Request(
                "http://localhost/api/admin/account/search?email=user@example.com",
                {
                    method: "GET",
                }
            );

            const response = await searchAccount(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to search for account",
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "user@example.com",
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    createdAt: true,
                },
            });
        });

        it("successfully returns the searched user", async () => {
            const searchedUser = {
                id: "user-123",
                name: "Tester",
                username: "tester",
                email: "tester@example.com",
                emailVerified: new Date("2026-07-17T12:00:00.000Z"),
                image: "https://example.com/profile.png",
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue(searchedUser);

            const request = new Request(
                "http://localhost/api/admin/account/search?email=tester@example.com",
                {
                    method: "GET",
                }
            );

            const response = await searchAccount(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...searchedUser,
                emailVerified: searchedUser.emailVerified.toISOString(),
                createdAt: searchedUser.createdAt.toISOString(),
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "tester@example.com",
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    createdAt: true,
                },
            });
        });
    });
});