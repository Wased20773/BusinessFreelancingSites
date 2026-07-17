import { Prisma } from "@business-freelancer/database";

export type MockItem = {
    id: string;
    businessId: string;
    categoryId: string;
    name: string;
    description: string | null;
    containsList: string[];
    calories: number | null;
    price: Prisma.Decimal;
    order: number;
    isAvailable: boolean;
    slug: string;
    imageKey: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export function createMockItem(
    overrides: Partial<MockItem> = {}
): MockItem {
    return {
        id: "item-123",
        businessId: "business-123",
        categoryId: "category-123",
        name: "Taco",
        description: "Taco with onion and cilantro",
        containsList: [],
        calories: null,
        price: new Prisma.Decimal("2.00"),
        order: 1,
        isAvailable: true,
        slug: "taco",
        imageKey: null,
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        ...overrides
    }
}