/**
 * @jest-environment node
 */

import type { Session } from "next-auth";
import { AccessLevel } from "@business-freelancer/database";

import { getSlug } from "@/app/api/route_helper";
import { mockPrisma } from "@/__tests__/mocks/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
    auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => {
    const {
        mockPrisma,
    } = require("@/__tests__/mocks/prisma");

    return {
        prisma: mockPrisma,
    };
});

jest.mock("@/app/api/route_helper", () => ({
    getSlug: jest.fn(),
}));

const mockedGetSlug = jest.mocked(getSlug);

describe("authenticateBusinessAccess", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when no authenticated session exists", async () => {
        mockedAuth.mockResolvedValue(null);

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const response = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner]
        );

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(401);

        expect(responseBody).toEqual({
            error: "Unauthorized Access",
        });

        expect(mockedGetSlug).not.toHaveBeenCalled();
        expect(
            mockPrisma.businessUser.findFirst
        ).not.toHaveBeenCalled();
    });

    it("returns 401 when the authenticated session has no email", async () => {
        mockedAuth.mockResolvedValue({
            user: {
                name: "Tester",
                email: undefined,
            },
            expires: "2099-01-01T00:00:00.000Z",
        });

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const response = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner]
        );

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(401);

        expect(responseBody).toEqual({
            error: "Unauthorized Access",
        });

        expect(mockedGetSlug).not.toHaveBeenCalled();

        expect(
            mockPrisma.businessUser.findFirst
        ).not.toHaveBeenCalled();
    });

    it("returns 400 when getting the business slug fails", async () => {
        mockedAuth.mockResolvedValue({
            user: {
                name: "Tester",
                email: "tester@example.com",
            },
            expires: "2099-01-01T00:00:00.000Z",
        });

        mockedGetSlug.mockImplementation(() => {
            throw new Error("Missing business slug");
        });

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const response = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner]
        );

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: "Failed to authenticate",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);

        expect(
            mockPrisma.businessUser.findFirst
        ).not.toHaveBeenCalled();
    });

    it("returns 403 when the user does not have access to the business", async () => {
        mockedAuth.mockResolvedValue({
            user: {
                name: "Tester",
                email: "tester@example.com",
            },
            expires: "2099-01-01T00:00:00.000Z",
        });

        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.businessUser.findFirst.mockResolvedValue(null);

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const allowedRoles = [
            AccessLevel.owner,
            AccessLevel.admin,
        ];

        const response = await authenticateBusinessAccess(
            request,
            allowedRoles
        );

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(403);

        expect(responseBody).toEqual({
            error: "Forbidden",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);

        expect(
            mockPrisma.businessUser.findFirst
        ).toHaveBeenCalledWith({
            where: {
                user: {
                    email: "tester@example.com",
                },
                business: {
                    slug: "tacos-el-guero",
                },
                role: {
                    accessLevel: {
                        in: allowedRoles,
                    },
                },
            },
            select: {
                business: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                    },
                },
            },
        });
    });

    it("returns 400 when the business access lookup fails", async () => {
        mockedAuth.mockResolvedValue({
            user: {
                name: "Tester",
                email: "tester@example.com",
            },
            expires: "2099-01-01T00:00:00.000Z",
        });

        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.businessUser.findFirst.mockRejectedValue(
            new Error("Database query failed")
        );

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const response = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner]
        );

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: "Failed to authenticate",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);

        expect(
            mockPrisma.businessUser.findFirst
        ).toHaveBeenCalledWith({
            where: {
                user: {
                    email: "tester@example.com",
                },
                business: {
                    slug: "tacos-el-guero",
                },
                role: {
                    accessLevel: {
                        in: [AccessLevel.owner],
                    },
                },
            },
            select: {
                business: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                    },
                },
            },
        });
    });

    it("returns the authenticated user and business identifiers when access is allowed", async () => {
        mockedAuth.mockResolvedValue({
            user: {
                name: "Tester",
                email: "tester@example.com",
            },
            expires: "2099-01-01T00:00:00.000Z",
        });

        mockedGetSlug.mockReturnValue("tacos-el-guero");

        mockPrisma.businessUser.findFirst.mockResolvedValue({
            business: {
                id: "business-123",
            },
            user: {
                id: "user-123",
            },
        });

        const request = new Request(
            "http://localhost/api/admin/test"
        );

        const allowedRoles = [
            AccessLevel.owner,
            AccessLevel.admin,
        ];

        const result = await authenticateBusinessAccess(
            request,
            allowedRoles
        );

        expect(result).not.toBeInstanceOf(Response);

        expect(result).toEqual({
            userId: "user-123",
            businessId: "business-123",
            slug: "tacos-el-guero",
        });

        expect(mockedGetSlug).toHaveBeenCalledWith(request);

        expect(
            mockPrisma.businessUser.findFirst
        ).toHaveBeenCalledWith({
            where: {
                user: {
                    email: "tester@example.com",
                },
                business: {
                    slug: "tacos-el-guero",
                },
                role: {
                    accessLevel: {
                        in: allowedRoles,
                    },
                },
            },
            select: {
                business: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                    },
                },
            },
        });
    });
});