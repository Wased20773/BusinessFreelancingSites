/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import {
    GET,
    POST,
} from "@/app/api/admin/business-users/route";
import {
    PATCH,
    DELETE,
} from "@/app/api/admin/business-users/[businessUserId]/route";

import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";
import { createRouteContext } from "@/__tests__/helpers/route";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

describe("/api/admin/business-users", () => {
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
                "http://localhost/api/admin/business-users",
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

            expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
        });

        it("returns 500 when fetching the business users fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.findMany.mockRejectedValue(
                new Error("Database query failed")
            );

            const request = new Request(
                "http://localhost/api/admin/business-users",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to fetch business users",
            });

            expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    businessId: true,
                    userId: true,
                    roleId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            accessLevel: true,
                            description: true,
                        },
                    },
                },
            });
        });

        it("returns an empty array when the business has no users", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.findMany.mockResolvedValue([]);

            const request = new Request(
                "http://localhost/api/admin/business-users",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual([]);

            expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    businessId: true,
                    userId: true,
                    roleId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            accessLevel: true,
                            description: true,
                        },
                    },
                },
            });
        });

        it("returns an empty array when the business has no users", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.findMany.mockResolvedValue([]);

            const request = new Request(
                "http://localhost/api/admin/business-users",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual([]);

            expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    businessId: true,
                    userId: true,
                    roleId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            accessLevel: true,
                            description: true,
                        },
                    },
                },
            });
        });

        it("successfully returns the business users", async () => {
            const businessUsers = [
                {
                    id: "business-user-123",
                    businessId: "business-123",
                    userId: "user-123",
                    roleId: "role-123",
                    user: {
                        id: "user-123",
                        name: "Bryan",
                        username: "bryan",
                        email: "bryan@example.com",
                    },
                    role: {
                        id: "role-123",
                        accessLevel: "admin",
                        description: "Business administrator",
                    },
                },
            ];

            mockSuccessfulAuthentication();

            mockPrisma.businessUser.findMany.mockResolvedValue(
                businessUsers
            );

            const request = new Request(
                "http://localhost/api/admin/business-users",
                {
                    method: "GET",
                }
            );

            const response = await GET(request);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual(businessUsers);

            expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
                where: {
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    businessId: true,
                    userId: true,
                    roleId: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                        },
                    },
                    role: {
                        select: {
                            id: true,
                            accessLevel: true,
                            description: true,
                        },
                    },
                },
            });
        });
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
                url: "http://localhost/api/admin/business-users",
                method: "POST",
                body: {
                    email: "newuser@example.com",
                    accessLevel: "staff",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
            expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
        });

        it("returns 404 when the selected user is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/business-users",
                method: "POST",
                body: {
                    email: "missing@example.com",
                    accessLevel: "staff",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "A selected user could not be found",
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "missing@example.com",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the selected access level is invalid", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
            });

            mockPrisma.role.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/business-users",
                method: "POST",
                body: {
                    email: "newuser@example.com",
                    accessLevel: "invalid-role",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Invalid access level selection",
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "newuser@example.com",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
                where: {
                    accessLevel: "invalid-role",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
        });

        it("returns 500 when linking the user to the business fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
            });

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
            });

            mockPrisma.businessUser.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/business-users",
                method: "POST",
                body: {
                    email: "newuser@example.com",
                    accessLevel: "staff",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to link user to business",
            });

            expect(mockPrisma.businessUser.create).toHaveBeenCalled();
        });

        it("successfully links the user to the business", async () => {
            const createdBusinessUser = {
                id: "business-user-123",
                user: {
                    updatedAt: new Date("2026-07-17T12:00:00.000Z"),
                },
                role: {
                    accessLevel: "staff",
                    description: "Business staff member",
                },
            };

            mockSuccessfulAuthentication();

            mockPrisma.user.findUnique.mockResolvedValue({
                id: "user-123",
            });

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
            });

            mockPrisma.businessUser.create.mockResolvedValue(
                createdBusinessUser
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/business-users",
                method: "POST",
                body: {
                    email: "newuser@example.com",
                    accessLevel: "staff",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual({
                ...createdBusinessUser,
                user: {
                    updatedAt:
                        createdBusinessUser.user.updatedAt.toISOString(),
                },
            });

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: {
                    email: "newuser@example.com",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
                where: {
                    accessLevel: "staff",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.create).toHaveBeenCalledWith({
                data: {
                    businessId: "business-123",
                    userId: "user-123",
                    roleId: "role-123",
                },
                select: {
                    id: true,
                    user: {
                        select: {
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

    describe("PATCH /[businessUserId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "PATCH",
                body: {
                    accessLevel: "admin",
                },
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.businessUser.update).not.toHaveBeenCalled();
        });

        it("returns 400 when the selected access level is invalid", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.role.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "PATCH",
                body: {
                    accessLevel: "invalid-role",
                },
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Invalid access level selection",
            });

            expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
                where: {
                    accessLevel: "invalid-role",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.businessUser.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the business user is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
            });

            mockPrisma.businessUser.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "PATCH",
                body: {
                    accessLevel: "admin",
                },
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This business user does not exist in our records",
            });

            expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
                where: {
                    accessLevel: "admin",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the business user fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
            });

            mockPrisma.businessUser.findFirst.mockResolvedValue({
                id: "business-user-123",
            });

            mockPrisma.businessUser.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "PATCH",
                body: {
                    accessLevel: "admin",
                },
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update business user",
            });

            expect(mockPrisma.businessUser.update).toHaveBeenCalled();
        });

        it("successfully updates the business user's role", async () => {
            const updatedBusinessUser = {
                id: "business-user-123",
                role: {
                    accessLevel: "admin",
                    description: "Business administrator",
                },
            };

            mockSuccessfulAuthentication();

            mockPrisma.role.findFirst.mockResolvedValue({
                id: "role-123",
            });

            mockPrisma.businessUser.findFirst.mockResolvedValue({
                id: "business-user-123",
            });

            mockPrisma.businessUser.update.mockResolvedValue(
                updatedBusinessUser
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "PATCH",
                body: {
                    accessLevel: "admin",
                },
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);
            expect(responseBody).toEqual(updatedBusinessUser);

            expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
                where: {
                    accessLevel: "admin",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.businessUser.update).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                },
                data: {
                    role: {
                        connect: {
                            id: "role-123",
                        },
                    },
                },
                select: {
                    id: true,
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

    describe("DELETE /[businessUserId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(
                mockPrisma.businessUser.deleteMany
            ).not.toHaveBeenCalled();
        });

        it("returns 404 when the business user is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.deleteMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This business user does not exist in our records",
            });

            expect(mockPrisma.businessUser.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                    businessId: "business-123",
                },
            });
        });

        it("returns 500 when deleting the business user fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.deleteMany.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete business user",
            });

            expect(mockPrisma.businessUser.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                    businessId: "business-123",
                },
            });
        });

        it("successfully deletes the business user", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.businessUser.deleteMany.mockResolvedValue({
                count: 1,
            });

            const request = createJsonRequest({
                url:
                    "http://localhost/api/admin/business-users/business-user-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                businessUserId: "business-user-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Business user deleted successfully",
            });

            expect(mockPrisma.businessUser.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "business-user-123",
                    businessId: "business-123",
                },
            });
        });
    });
});