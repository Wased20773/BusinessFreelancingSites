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
}));

jest.mock("@/lib/s3/copy", () => ({
  copyObject: jest.fn(),
}));

jest.mock("@/lib/s3/get-url", () => ({
  getObjectUrl: jest.fn(),
}));
