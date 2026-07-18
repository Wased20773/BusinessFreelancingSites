/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
    prisma: {},
}));

import { imageRequestValidation } from "@/app/api/route_helper";
import { createMockImage } from "../fixtures/image";

describe("imageRequestValidation", () => {
    it("returns 500 when the request body cannot be parsed as form data", async () => {
        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    image: "not-form-data",
                }),
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error: expect.stringContaining(
                "Failed to get form data from request"
            ),
        });
    });
    
    it('returns 400 when the "image" form-data field is not a file', async () => {
        const formData = new FormData();
        formData.set("image", "not-a-file");

        const request = new Request(
            "http://localhost/api/test",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error:
                'Missing image file. Please submit the file using the "image" form-data field',
        });
    });
    
    it('returns 400 when the "image" form-data field is missing', async () => {
        const formData = new FormData();

        const request = new Request(
            "http://localhost/api/test",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);

        expect(responseBody).toEqual({
            error:
                'Missing image file. Please submit the file using the "image" form-data field',
        });
    });

    it("returns 400 when the uploaded image is empty", async () => {
        const formData = new FormData();

        const emptyImage = new File(
            [],
            "empty.png",
            {
                type: "image/png",
            }
        );

        formData.set("image", emptyImage);

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(400);
        expect(responseBody).toEqual({
            error: "The uploaded image is empty",
        });
    });

    it("returns 413 when the image exceeds 2 MB", async () => {
        const formData = new FormData();

        formData.set(
            "image",
            createMockImage({
                size: 2 * 1024 * 1024 + 1,
            })
        );

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(413);
        expect(responseBody).toEqual({
            error: "The image cannot be larger than 2 MB",
        });
    });

    it("returns 415 when the image type is not supported", async () => {
        const formData = new FormData();

        formData.set(
            "image",
            createMockImage({
                type: "image/gif",
            })
        );

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(415);

        expect(responseBody).toEqual({
            error: "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
        });
    });

    it("accepts an image that is exactly 2 MB", async () => {
        const image = createMockImage({
            size: 2 * 1024 * 1024,
        });

        const formData = new FormData();
        formData.set("image", image);

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(File);

        if (!(response instanceof File)) {
            throw new Error("Expected a File");
        }

        expect(response.name).toBe(image.name);
        expect(response.type).toBe(image.type);
        expect(response.size).toBe(2 * 1024 * 1024);
    });

    it.each([
        ["image/jpeg", "taco.jpg"],
        ["image/png", "taco.png"],
        ["image/webp", "taco.webp"],
    ])("accepts %s images", async (type, name) => {
        const image = createMockImage({
            type,
            name,
        });

        const formData = new FormData();
        formData.set("image", image);

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(File);

        if (!(response instanceof File)) {
            throw new Error("Expected a File");
        }

        expect(response.name).toBe(name);
        expect(response.type).toBe(type);
        expect(response.size).toBe(image.size);
    });

    it("accepts a supported MIME type even when the filename extension does not match", async () => {
        const image = createMockImage({
            name: "taco.png",
            type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("image", image);

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(File);

        if (!(response instanceof File)) {
            throw new Error("Expected a File");
        }

        expect(response.name).toBe("taco.png");
        expect(response.type).toBe("image/jpeg");
    });

    it("returns 415 for a generic binary file type", async () => {
        const image = createMockImage({
            name: "upload.bin",
            type: "application/octet-stream",
        });

        const formData = new FormData();
        formData.set("image", image);

        const request = new Request(
            "http://localhost/api/admin/items/item-123/image",
            {
                method: "POST",
                body: formData,
            }
        );

        const response = await imageRequestValidation(request);

        expect(response).toBeInstanceOf(Response);

        if (!(response instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await response.json();

        expect(response.status).toBe(415);
        expect(responseBody).toEqual({
            error:
                "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
        });
    });
});