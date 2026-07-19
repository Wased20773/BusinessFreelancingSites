/**
 * @jest-environment node
 */

import { mockSuccessfulAuthentication } from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/admin/contacts/route";
import {
    PATCH,
    DELETE,
} from "@/app/api/admin/contacts/[contactId]/route";
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

describe("/api/admin/contacts", () => {
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
                url: "http://localhost/api/admin/contacts",
                method: "POST",
                body: {
                    phoneNumber: "503-555-1234",
                    email: "contact@example.com",
                    isPersonal: false,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.contact.create).not.toHaveBeenCalled();
        });

        it("returns 400 when both the phone number and email are missing", async () => {
            mockSuccessfulAuthentication();

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts",
                method: "POST",
                body: {
                    isPersonal: false,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(400);

            expect(responseBody).toEqual({
                error: "A contact must include either a phone number or an email",
            });

            expect(mockPrisma.contact.create).not.toHaveBeenCalled();
        });

        it("returns 500 when creating the contact fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.create.mockRejectedValue(
                new Error("Database create failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts",
                method: "POST",
                body: {
                    phoneNumber: "503-555-1234",
                    email: "contact@example.com",
                    isPersonal: false,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to create contact",
            });

            expect(mockPrisma.contact.create).toHaveBeenCalled();
        });
    
        it("successfully creates a contact", async () => {
            const createdContact = {
                id: "contact-123",
                phoneNumber: "503-555-1234",
                email: "contact@example.com",
                isPersonal: false,
                createdAt: new Date("2026-07-17T12:00:00.000Z"),
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.contact.create.mockResolvedValue(
                createdContact
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts",
                method: "POST",
                body: {
                    phoneNumber: "503-555-1234",
                    email: "contact@example.com",
                    isPersonal: false,
                },
            });

            const response = await POST(request);
            const responseBody = await response.json();

            expect(response.status).toBe(201);

            expect(responseBody).toEqual({
                ...createdContact,
                createdAt: createdContact.createdAt.toISOString(),
                updatedAt: createdContact.updatedAt.toISOString(),
            });

            expect(mockPrisma.contact.create).toHaveBeenCalledWith({
                data: {
                    businessId: "business-123",
                    phoneNumber: "503-555-1234",
                    email: "contact@example.com",
                    isPersonal: false,
                },
                select: {
                    id: true,
                    phoneNumber: true,
                    email: true,
                    isPersonal: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("PATCH /[contactId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "PATCH",
                body: {
                    phoneNumber: "503-555-9876",
                    email: "updated@example.com",
                    isPersonal: true,
                },
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.contact.update).not.toHaveBeenCalled();
        });

        it("returns 404 when the contact is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.findFirst.mockResolvedValue(null);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "PATCH",
                body: {
                    phoneNumber: "503-555-9876",
                    email: "updated@example.com",
                    isPersonal: true,
                },
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This contact does not exist in our records",
            });

            expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "contact-123",
                    businessId: "business-123",
                },
                select: {
                    id: true,
                },
            });

            expect(mockPrisma.contact.update).not.toHaveBeenCalled();
        });

        it("returns 500 when updating the contact fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.findFirst.mockResolvedValue({
                id: "contact-123",
            });

            mockPrisma.contact.update.mockRejectedValue(
                new Error("Database update failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "PATCH",
                body: {
                    phoneNumber: "503-555-9876",
                    email: "updated@example.com",
                    isPersonal: true,
                },
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to update contact",
            });

            expect(mockPrisma.contact.update).toHaveBeenCalled();
        });
        
        it("successfully updates the contact", async () => {
            const updatedContact = {
                id: "contact-123",
                phoneNumber: "503-555-9876",
                email: "updated@example.com",
                isPersonal: true,
                updatedAt: new Date("2026-07-17T12:00:00.000Z"),
            };

            mockSuccessfulAuthentication();

            mockPrisma.contact.findFirst.mockResolvedValue({
                id: "contact-123",
            });

            mockPrisma.contact.update.mockResolvedValue(updatedContact);

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "PATCH",
                body: {
                    phoneNumber: "503-555-9876",
                    email: "updated@example.com",
                    isPersonal: true,
                },
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await PATCH(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                ...updatedContact,
                updatedAt: updatedContact.updatedAt.toISOString(),
            });

            expect(mockPrisma.contact.update).toHaveBeenCalledWith({
                where: {
                    id: "contact-123",
                },
                data: {
                    phoneNumber: "503-555-9876",
                    email: "updated@example.com",
                    isPersonal: true,
                },
                select: {
                    id: true,
                    phoneNumber: true,
                    email: true,
                    isPersonal: true,
                    updatedAt: true,
                },
            });
        });
    });

    describe("DELETE /[contactId]", () => {
        it("returns the authentication error response", async () => {
            mockedAuthenticateBusinessAccess.mockResolvedValue(
                NextResponse.json(
                    { error: "Unauthorized Access" },
                    { status: 401 }
                )
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(401);

            expect(responseBody).toEqual({
                error: "Unauthorized Access",
            });

            expect(mockPrisma.contact.deleteMany).not.toHaveBeenCalled();
        });

        it("returns 404 when the contact is not found", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.deleteMany.mockResolvedValue({
                count: 0,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(404);

            expect(responseBody).toEqual({
                error: "This contact does not exist in our records",
            });

            expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "contact-123",
                    businessId: "business-123",
                },
            });
        });
        it("returns 500 when deleting the contact fails", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.deleteMany.mockRejectedValue(
                new Error("Database delete failed")
            );

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(500);

            expect(responseBody).toEqual({
                error: "Failed to delete contact",
            });

            expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "contact-123",
                    businessId: "business-123",
                },
            });
        });
        
        it("successfully deletes the contact", async () => {
            mockSuccessfulAuthentication();

            mockPrisma.contact.deleteMany.mockResolvedValue({
                count: 1,
            });

            const request = createJsonRequest({
                url: "http://localhost/api/admin/contacts/contact-123",
                method: "DELETE",
            });

            const context = createRouteContext({
                contactId: "contact-123",
            });

            const response = await DELETE(request, context);
            const responseBody = await response.json();

            expect(response.status).toBe(200);

            expect(responseBody).toEqual({
                message: "Contact deleted successfully",
            });

            expect(mockPrisma.contact.deleteMany).toHaveBeenCalledWith({
                where: {
                    id: "contact-123",
                    businessId: "business-123",
                },
            });
        });
    });
});