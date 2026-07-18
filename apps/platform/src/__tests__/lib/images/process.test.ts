/**
 * @jest-environment node
 */

import sharp from "sharp";

import { processImage } from "@/lib/images/process";

jest.mock("sharp", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockedSharp = jest.mocked(sharp);

describe("processImage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("throws when reading the image data fails", async () => {
        const image = {
            type: "image/png",
            arrayBuffer: jest.fn().mockRejectedValue(
                new Error("Failed to read image data")
            ),
        } as unknown as File;

        await expect(
            processImage(image)
        ).rejects.toThrow("Failed to read image data");

        expect(mockedSharp).not.toHaveBeenCalled();
    });

    it("throws when Sharp processing fails", async () => {
        const image = new File(
            [new Uint8Array(1024)],
            "taco.png",
            {
                type: "image/png",
            }
        );

        const mockedToBuffer = jest.fn().mockRejectedValue(
            new Error("Sharp processing failed")
        );

        const mockedWebp = jest.fn().mockReturnValue({
            toBuffer: mockedToBuffer,
        });

        const mockedRotate = jest.fn().mockReturnValue({
            webp: mockedWebp,
        });

        mockedSharp.mockReturnValue({
            rotate: mockedRotate,
        } as never);

        await expect(
            processImage(image)
        ).rejects.toThrow("Sharp processing failed");

        expect(mockedSharp).toHaveBeenCalledWith(
            expect.any(Buffer)
        );

        expect(mockedRotate).toHaveBeenCalled();

        expect(mockedWebp).toHaveBeenCalledWith({
            quality: 80,
            alphaQuality: 100,
        });

        expect(mockedToBuffer).toHaveBeenCalled();
    });

    it("returns the WebP image when it is smaller than the original", async () => {
        const image = new File(
            [new Uint8Array(1024)],
            "taco.png",
            {
                type: "image/png",
            }
        );

        const webpBuffer = Buffer.alloc(512);

        const mockedToBuffer = jest
            .fn()
            .mockResolvedValue(webpBuffer);

        const mockedWebp = jest.fn().mockReturnValue({
            toBuffer: mockedToBuffer,
        });

        const mockedRotate = jest.fn().mockReturnValue({
            webp: mockedWebp,
        });

        mockedSharp.mockReturnValue({
            rotate: mockedRotate,
        } as never);

        const result = await processImage(image);

        expect(result).toEqual({
            buffer: webpBuffer,
            contentType: "image/webp",
            extension: "webp",
        });

        expect(mockedSharp).toHaveBeenCalledWith(
            expect.any(Buffer)
        );

        expect(mockedRotate).toHaveBeenCalled();

        expect(mockedWebp).toHaveBeenCalledWith({
            quality: 80,
            alphaQuality: 100,
        });

        expect(mockedToBuffer).toHaveBeenCalled();
    });

    it("returns the original JPEG when it is smaller than the WebP image", async () => {
        const originalBuffer = Buffer.alloc(512);

        const image = new File(
            [originalBuffer],
            "taco.jpg",
            {
                type: "image/jpeg",
            }
        );

        const webpBuffer = Buffer.alloc(1024);

        const mockedToBuffer = jest
            .fn()
            .mockResolvedValue(webpBuffer);

        const mockedWebp = jest.fn().mockReturnValue({
            toBuffer: mockedToBuffer,
        });

        const mockedRotate = jest.fn().mockReturnValue({
            webp: mockedWebp,
        });

        mockedSharp.mockReturnValue({
            rotate: mockedRotate,
        } as never);

        const result = await processImage(image);

        expect(result).toEqual({
            buffer: originalBuffer,
            contentType: "image/jpeg",
            extension: "jpg",
        });
    });

    it("returns the original image when both images are the same size", async () => {
        const originalBuffer = Buffer.alloc(1024);

        const image = new File(
            [originalBuffer],
            "taco.png",
            {
                type: "image/png",
            }
        );

        const webpBuffer = Buffer.alloc(1024);

        const mockedToBuffer = jest
            .fn()
            .mockResolvedValue(webpBuffer);

        const mockedWebp = jest.fn().mockReturnValue({
            toBuffer: mockedToBuffer,
        });

        const mockedRotate = jest.fn().mockReturnValue({
            webp: mockedWebp,
        });

        mockedSharp.mockReturnValue({
            rotate: mockedRotate,
        } as never);

        const result = await processImage(image);

        expect(result).toEqual({
            buffer: originalBuffer,
            contentType: "image/png",
            extension: "png",
        });
    });

    it.each([
        ["image/png", "taco.png", "png"],
        ["image/webp", "taco.webp", "webp"],
    ] as const)(
        "returns the original %s image with the correct extension",
        async (contentType, fileName, extension) => {
            const originalBuffer = Buffer.alloc(512);

            const image = new File(
                [originalBuffer],
                fileName,
                {
                    type: contentType,
                }
            );

            const webpBuffer = Buffer.alloc(1024);

            const mockedToBuffer = jest
                .fn()
                .mockResolvedValue(webpBuffer);

            const mockedWebp = jest.fn().mockReturnValue({
                toBuffer: mockedToBuffer,
            });

            const mockedRotate = jest.fn().mockReturnValue({
                webp: mockedWebp,
            });

            mockedSharp.mockReturnValue({
                rotate: mockedRotate,
            } as never);

            const result = await processImage(image);

            expect(result).toEqual({
                buffer: originalBuffer,
                contentType,
                extension,
            });
        }
    );

    it("throws when an unsupported image type reaches processImage", async () => {
        const originalBuffer = Buffer.alloc(512);

        const image = new File(
            [originalBuffer],
            "document.pdf",
            {
                type: "application/pdf",
            }
        );

        const webpBuffer = Buffer.alloc(1024);

        const mockedToBuffer = jest
            .fn()
            .mockResolvedValue(webpBuffer);

        const mockedWebp = jest.fn().mockReturnValue({
            toBuffer: mockedToBuffer,
        });

        const mockedRotate = jest.fn().mockReturnValue({
            webp: mockedWebp,
        });

        mockedSharp.mockReturnValue({
            rotate: mockedRotate,
        } as never);

        await expect(
            processImage(image)
        ).rejects.toThrow("Unsupported image content type");
    });
});