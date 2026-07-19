/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/socials/route";
import {
    PATCH,
    DELETE,
} from "@/app/api/admin/socials/[socialId]/route";
import { createSlug } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";
import { createRouteContext } from "@/__tests__/helpers/route";

jest.mock("@/lib/prisma", () => ({
    prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
    authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/app/api/route_helper", () => ({
    createSlug: jest.fn(),
    getSlug: jest.fn(),
}));

const mockedAuthenticateBusinessAccess =
    jest.mocked(authenticateBusinessAccess);

const mockedCreateSlug =
    jest.mocked(createSlug);

describe("/api/admin/socials", () => {
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
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    domain: "instagram.com",
                    profileName: "Tacos El Guero",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the domain is missing", async () => {
            mockSuccessfulAuthentication();

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    profileName: "Tacos El Guero",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing Domain Name",
            });

            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the domain is missing", async () => {
            mockSuccessfulAuthentication();

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    profileName: "Tacos El Guero",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing Domain Name",
            });

            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the social profile name is missing", async () => {
            mockSuccessfulAuthentication();

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    domain: "instagram.com",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing social profile name",
            });

            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.create).not.toHaveBeenCalled();
        });

        it("returns 400 when the social icon is missing", async () => {
            mockSuccessfulAuthentication();

            mockedCreateSlug.mockReturnValue("tacos-el-guero");

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    domain: "instagram.com",
                    profileName: "Tacos El Guero",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "Missing social icon",
            });

            expect(mockedCreateSlug).toHaveBeenCalledWith(
                "Tacos El Guero"
            );

            expect(mockPrisma.social.create).not.toHaveBeenCalled();
        });

        it("returns 500 when creating the social fails", async () => {
            mockSuccessfulAuthentication();

            mockedCreateSlug.mockReturnValue("tacos-el-guero");

            mockPrisma.social.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    domain: "instagram.com",
                    profileName: "Tacos El Guero",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to create social",
            });

            expect(mockedCreateSlug).toHaveBeenCalledWith(
                "Tacos El Guero"
            );

            expect(mockPrisma.social.create).toHaveBeenCalled();
        });

        it("successfully creates a social", async () => {
            const createdSocial = {
                id: "social-123",
                domain: "instagram.com",
                profileName: "Tacos El Guero",
                url: "https://instagram.com/tacos-el-guero",
                icon: "instagram",
            };

            mockSuccessfulAuthentication();

            mockedCreateSlug.mockReturnValue("tacos-el-guero");

            mockPrisma.social.create.mockResolvedValue(createdSocial);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials",
                method: "POST",
                body: {
                    domain: "instagram.com",
                    profileName: "Tacos El Guero",
                    icon: "instagram",
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual(createdSocial);

            expect(mockedCreateSlug).toHaveBeenCalledWith(
                "Tacos El Guero"
            );

            expect(mockPrisma.social.create).toHaveBeenCalledWith({
                data: {
                    businessId: "business-123",
                    domain: "instagram.com",
                    profileName: "Tacos El Guero",
                    url: "https://instagram.com/tacos-el-guero",
                    icon: "instagram",
                },
                select: {
                    id: true,
                    domain: true,
                    profileName: true,
                    url: true,
                    icon: true,
                },
            });
        });
    });

    describe("PATCH /[socialId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "PATCH",
                body: {
                    domain: "facebook.com",
                    profileName: "Tacos El Guero",
                    icon: "facebook",
                },
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.social.findFirst).not.toHaveBeenCalled();
            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the social is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.social.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "PATCH",
                body: {
                    domain: "facebook.com",
                    profileName: "Tacos El Guero",
                    icon: "facebook",
                },
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This social does not exist in our records",
            });

            expect(mockPrisma.social.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "social-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                    domain: true,
                    profileName: true,
                },
            });

            expect(mockedCreateSlug).not.toHaveBeenCalled();
            expect(mockPrisma.social.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the social fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.social.findFirst.mockResolvedValue({
                id: "social-123",
                domain: "instagram.com",
                profileName: "Old Profile",
            });

            mockedCreateSlug.mockReturnValue("old-profile");

            mockPrisma.social.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "PATCH",
                body: {
                    domain: "facebook.com",
                    profileName: "New Profile",
                    icon: "facebook",
                },
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update social",
            });

            expect(mockedCreateSlug).toHaveBeenCalledWith(
                "New Profile"
            );

            expect(mockPrisma.social.update).toHaveBeenCalled();
        });

        it("successfully updates the social", async () => {
            const updatedSocial = {
                id: "social-123",
                domain: "facebook.com",
                profileName: "New Profile",
                url: "https://facebook.com/new-profile",
                icon: "facebook",
            };

            mockSuccessfulAuthentication();

            mockPrisma.social.findFirst.mockResolvedValue({
                id: "social-123",
                domain: "instagram.com",
                profileName: "Old Profile",
            });

            mockedCreateSlug.mockReturnValue("new-profile");

            mockPrisma.social.update.mockResolvedValue(updatedSocial);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "PATCH",
                body: {
                    domain: "facebook.com",
                    profileName: "New Profile",
                    icon: "facebook",
                },
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual(updatedSocial);

            expect(mockedCreateSlug).toHaveBeenCalledWith(
                "New Profile"
            );

            expect(mockPrisma.social.update).toHaveBeenCalledWith({
                where: {
                    id: "social-123",
                },
                data: {
                    domain: "facebook.com",
                    profileName: "New Profile",
                    url: "https://facebook.com/new-profile",
                    icon: "facebook",
                },
                select: {
                    id: true,
                    domain: true,
                    profileName: true,
                    url: true,
                    icon: true,
                },
            });
        });
    });

    describe("DELETE /[socialId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.social.deleteMany).not.toHaveBeenCalled();
        });

        it("returns 404 when the social is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.social.deleteMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This social does not exist in our records",
            });

            expect(mockPrisma.social.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "social-123",
                    businessId: "business-123",
                },
            });
        });

        it("returns 500 when deleting the social fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.social.deleteMany.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete social",
            });

            expect(mockPrisma.social.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "social-123",
                    businessId: "business-123",
                },
            });
        });

        it("successfully deletes the social", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.social.deleteMany.mockResolvedValue({
                count: 1,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/socials/social-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                socialId: "social-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Social deleted successfully",
            });

            expect(mockPrisma.social.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "social-123",
                    businessId: "business-123",
                },
            });
        });
    });
});