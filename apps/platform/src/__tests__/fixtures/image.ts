type MockImageOptions = {
    name: string;
    type: string;
    size: number;
};

export function createMockImage(
    overrides: Partial<MockImageOptions> = {}
): File {
    const image = {
        name: "taco.png",
        type: "image/png",
        size: 1024,
        ...overrides,
    };

    return new File(
        [new Uint8Array(image.size)],
        image.name,
        {
            type: image.type,
        }
    );
}