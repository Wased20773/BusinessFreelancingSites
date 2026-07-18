export const mockPrisma = {
    category: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },

    item: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },

    $transaction: jest.fn(),
};