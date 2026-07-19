/**
 * @jest-environment node
 */
import { 
    getSlug,
    createSlug,
    getBusinessResponse,
    imageRequestValidation,
    normalizeDayOfWeek,
    timeToMinutes,
    checkTimeOverlap,
    getNextOrder
} from "@/app/api/route_helper";
import { createMockImage } from "../fixtures/image";
import { mockPrisma } from "@/__tests__/mocks/prisma";

jest.mock("@/lib/prisma", () => {
    const {
        mockPrisma,
    } = require("@/__tests__/mocks/prisma");

    return {
        prisma: mockPrisma,
    };
});

describe("getSlug", () => {
    it("returns the business slug from the request query parameters", () => {
        const request = new Request(
            "http://localhost/api/business?slug=tacos-el-guero"
        );

        const slug = getSlug(request);

        expect(slug).toBe("tacos-el-guero");
    });

    it("throws when the business slug is missing", () => {
        const request = new Request(
            "http://localhost/api/business"
        );

        expect(() => getSlug(request)).toThrow(
            "Missing business slug"
        );
    });
});

describe("getNextOrder", () => {
    it("returns 1 when no existing records are found", async () => {
        const model = {
            findFirst: jest.fn().mockResolvedValue(null),
        };

        const where = {
            businessId: "business-123",
        };

        const result = await getNextOrder(
            model,
            where
        );

        expect(result).toBe(1);

        expect(model.findFirst).toHaveBeenCalledWith({
            where: {
                businessId: "business-123",
            },
            orderBy: {
                order: "desc",
            },
            select: {
                order: true,
            },
        });
    });

    it("returns the next order value after the highest existing order", async () => {
        const model = {
            findFirst: jest.fn().mockResolvedValue({
                order: 4,
            }),
        };

        const where = {
            itemId: "item-123",
        };

        const result = await getNextOrder(
            model,
            where
        );

        expect(result).toBe(5);

        expect(model.findFirst).toHaveBeenCalledWith({
            where: {
                itemId: "item-123",
            },
            orderBy: {
                order: "desc",
            },
            select: {
                order: true,
            },
        });
    });

    it("returns 500 when determining the next order fails", async () => {
        const model = {
            findFirst: jest.fn().mockRejectedValue(
                new Error("Database query failed")
            ),
        };

        const result = await getNextOrder(
            model,
            {
                businessId: "business-123",
            }
        );

        expect(result).toBeInstanceOf(Response);

        if (!(result instanceof Response)) {
            throw new Error("Expected a Response");
        }

        const responseBody = await result.json();

        expect(result.status).toBe(500);

        expect(responseBody).toEqual({
            error: expect.stringContaining(
                "Failed to determine the next order"
            ),
        });

        expect(model.findFirst).toHaveBeenCalledWith({
            where: {
                businessId: "business-123",
            },
            orderBy: {
                order: "desc",
            },
            select: {
                order: true,
            },
        });
    });
});

describe("createSlug", () => {
    it.each([
        ["Tacos El Guero", "tacos-el-guero"],
        ["  Tacos   El   Guero  ", "tacos-el-guero"],
        ["Tacos---El---Guero", "tacos-el-guero"],
        ["Tacos & Burritos!", "tacos-burritos"],
        ["123 Main Street", "123-main-street"],
        ["TACOS", "tacos"],
        ["", ""],
    ])(
        'converts "%s" into "%s"',
        (input, expected) => {
            expect(createSlug(input)).toBe(expected);
        }
    );
});

describe("getBusinessResponse", () => {
    const businessSelect = {
        id: true,
        name: true,
        slug: true,
    } as const;

    it("returns a resource-specific 404 when the business is not found", async () => {
        mockPrisma.business.findUnique.mockResolvedValue(null);

        const response = await getBusinessResponse(
            "missing-business",
            businessSelect,
            "menu"
        );

        const responseBody = await response.json();

        expect(response.status).toBe(404);

        expect(responseBody).toEqual({
            error: "Business not found while fetching menu data",
        });

        expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
            where: {
                slug: "missing-business",
            },
            select: businessSelect,
        });
    });

    it("returns a resource-specific 500 when fetching the business fails", async () => {
        mockPrisma.business.findUnique.mockRejectedValue(
            new Error("Database query failed")
        );

        const response = await getBusinessResponse(
            "tacos-el-guero",
            {
                id: true,
                name: true,
                slug: true,
            },
            "menu"
        );

        const responseBody = await response.json();

        expect(response.status).toBe(500);

        expect(responseBody).toEqual({
            error: "Failed to fetch menu data",
        });

        expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
            where: {
                slug: "tacos-el-guero",
            },
            select: {
                id: true,
                name: true,
                slug: true,
            },
        })
    });

    it("successfully returns the selected business data", async () => {
        const business = {
            id: "business-123",
            name: "Tacos El Guero",
            slug: "tacos-el-guero",
        };

        mockPrisma.business.findUnique.mockResolvedValue(
            business as never
        );

        const response = await getBusinessResponse(
            "tacos-el-guero",
            businessSelect,
            "business"
        );

        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody).toEqual(business);

        expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
            where: {
                slug: "tacos-el-guero",
            },
            select: businessSelect,
        });
    });
});

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

describe("normalizeDayOfWeek", () => {
    it.each([
        ["monday", "Monday"],
        ["MONDAY", "Monday"],
        ["Monday", "Monday"],
        ["tUeSdAy", "Tuesday"],
        ["wednesday", "Wednesday"],
        ["THURSDAY", "Thursday"],
        ["friday", "Friday"],
        ["SATURDAY", "Saturday"],
        ["sunday", "Sunday"],
    ])(
        'normalizes "%s" to "%s"',
        (input, expected) => {
            expect(normalizeDayOfWeek(input)).toBe(expected);
        }
    );

    it.each([
        "",
        "mon",
        "weekday",
        "holiday",
        "123",
        "monday ",
        " monday",
    ])(
        'returns null for "%s"',
        (input) => {
            expect(normalizeDayOfWeek(input)).toBeNull();
        }
    );
});

describe("timeToMinutes", () => {
    it.each([
        ["00:00", 0],
        ["00:30", 30],
        ["01:00", 60],
        ["09:30", 570],
        ["12:00", 720],
        ["17:45", 1065],
        ["23:59", 1439],
    ])(
        'converts "%s" to %i minutes',
        (time, expected) => {
            expect(timeToMinutes(time)).toBe(expected);
        }
    );
});

describe("checkTimeOverlap", () => {
    it.each([
        ["09:00", "12:00", "11:00", "14:00"],
        ["11:00", "14:00", "09:00", "12:00"],
        ["09:00", "15:00", "10:00", "12:00"],
        ["10:00", "12:00", "09:00", "15:00"],
        ["09:00", "12:00", "09:00", "12:00"],
    ])(
        "returns true when %s-%s overlaps %s-%s",
        (
            newOpenTime,
            newCloseTime,
            existingOpenTime,
            existingCloseTime
        ) => {
            expect(
                checkTimeOverlap(
                    newOpenTime,
                    newCloseTime,
                    existingOpenTime,
                    existingCloseTime
                )
            ).toBe(true);
        }
    );

    it.each([
        ["09:00", "12:00", "12:00", "15:00"],
        ["12:00", "15:00", "09:00", "12:00"],
        ["09:00", "11:00", "12:00", "15:00"],
        ["16:00", "18:00", "09:00", "12:00"],
    ])(
        "returns false when %s-%s does not overlap %s-%s",
        (
            newOpenTime,
            newCloseTime,
            existingOpenTime,
            existingCloseTime
        ) => {
            expect(
                checkTimeOverlap(
                    newOpenTime,
                    newCloseTime,
                    existingOpenTime,
                    existingCloseTime
                )
            ).toBe(false);
        }
    );
});