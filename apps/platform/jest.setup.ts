import "@testing-library/jest-dom";

/*
 * External services are never reached in tests.
 *
 * - The Redis client connects with a top-level await on import, so any route
 *   importing route_helper would otherwise try to reach Redis.
 * - S3 helpers would otherwise create real AWS clients.
 *
 * Tests set return values on these mocks as needed.
 */
jest.mock("@/lib/redis/tokenBucket", () => ({
  consumeToken: jest.fn(),
}));

jest.mock("@/lib/s3/upload", () => ({
  uploadImage: jest.fn(),
}));

jest.mock("@/lib/s3/delete", () => ({
  deleteObject: jest.fn(),
  deleteObjects: jest.fn(),
}));

jest.mock("@/lib/s3/copy", () => ({
  copyObject: jest.fn(),
}));

jest.mock("@/lib/s3/get-url", () => ({
  getObjectUrl: jest.fn(),
}));

/*
 * Sync is a paid feature (see lib/billing/sync.ts). By default tests run as a
 * plan that includes sync, so a requested sync is allowed. This is a plain
 * function, not jest.fn, so jest.resetAllMocks() does not clear it.
 *
 * Tests for the Free behavior use the real module instead:
 *   jest.mock("@/lib/billing/sync", () => jest.requireActual("@/lib/billing/sync"));
 * and set the plan with mockBusinessPlan() from __tests__/helpers/billing.
 */
/*
 * Stripe is never reached in tests. Routes that delete a business or remove a
 * member call these first; tests assert on them (they resolve to undefined
 * after jest.resetAllMocks()). lib/billing/cancelSubscription.test.ts tests
 * the real module.
 */
jest.mock("@/lib/billing/cancelSubscription", () => ({
  cancelSubscriptionForDeletedBusiness: jest.fn(),
  cancelSubscriptionForDepartingPayer: jest.fn(),
}));

jest.mock("@/lib/billing/sync", () => ({
  allowSync: async (_businessId: string, requested: boolean) => requested,
}));
