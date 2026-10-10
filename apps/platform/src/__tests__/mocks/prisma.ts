/*
 * A Prisma client mock with every model and method the API routes use.
 *
 * Call resetPrismaMock() in beforeEach (after jest.resetAllMocks()) to restore
 * the default $transaction behavior.
 */
const MODEL_METHODS = [
  "findUnique",
  "findFirst",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "groupBy",
] as const;

type MockModel = Record<(typeof MODEL_METHODS)[number], jest.Mock>;

function createMockModel(): MockModel {
  return Object.fromEntries(
    MODEL_METHODS.map((method) => [method, jest.fn()]),
  ) as MockModel;
}

export const mockPrisma = {
  business: createMockModel(),
  businessApiKey: createMockModel(),
  businessUser: createMockModel(),
  category: createMockModel(),
  contact: createMockModel(),
  hour: createMockModel(),
  item: createMockModel(),
  itemOption: createMockModel(),
  location: createMockModel(),
  locationDay: createMockModel(),
  role: createMockModel(),
  social: createMockModel(),
  user: createMockModel(),

  $transaction: jest.fn(),
};

/*
 * Supports both forms of prisma.$transaction:
 *   $transaction([promiseA, promiseB]) -> resolves every promise
 *   $transaction(async (tx) => {...})  -> runs the callback with mockPrisma as tx
 */
export function resetPrismaMock(): void {
  mockPrisma.$transaction.mockImplementation(async (argument: unknown) => {
    if (typeof argument === "function") {
      return argument(mockPrisma);
    }

    return Promise.all(argument as Promise<unknown>[]);
  });
}
