/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/socials/route";
import { createSlug } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

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
});