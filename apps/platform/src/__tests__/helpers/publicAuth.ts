import {
  authenticateBusinessReadAccess,
  type LocationReadAuthentication,
} from "@/lib/auth/authenticateBusinessReadAccess";
import { consumeToken } from "@/lib/redis/tokenBucket";
import { NextResponse } from "next/server";

import { BUSINESS_ID, LOCATION_ID, USER_ID } from "@/__tests__/helpers/ids";

/*
 * These helpers expect the test file to mock authenticateBusinessReadAccess:
 *
 * jest.mock("@/lib/auth/authenticateBusinessReadAccess", () => ({
 *   authenticateBusinessReadAccess: jest.fn(),
 * }));
 *
 * consumeToken is mocked globally in jest.setup.ts.
 */
const mockedAuthenticateBusinessReadAccess = jest.mocked(
  authenticateBusinessReadAccess,
);

const mockedConsumeToken = jest.mocked(consumeToken);

/*
 * authenticateBusinessReadAccess is overloaded, and jest.mocked() only sees the
 * last (business-level) signature, so location-level results are cast.
 */
function mockReadAccess(result: LocationReadAuthentication): void {
  mockedAuthenticateBusinessReadAccess.mockResolvedValue(result as never);
}

export function mockSessionReadAccess(): void {
  mockReadAccess({
    businessId: BUSINESS_ID,
    locationId: LOCATION_ID,
    userId: USER_ID,
    authenticationType: "session",
  });
}

export function mockApiKeyReadAccess(): void {
  mockReadAccess({
    businessId: BUSINESS_ID,
    locationId: LOCATION_ID,
    authenticationType: "apiKey",
  });

  mockedConsumeToken.mockResolvedValue({
    allowed: true,
    remainingTokens: 149,
    retryAfterMs: 0,
  });
}

export function mockRateLimitedApiKey(): void {
  mockApiKeyReadAccess();

  mockedConsumeToken.mockResolvedValue({
    allowed: false,
    remainingTokens: 0,
    retryAfterMs: 1000,
  });
}

export function mockFailedReadAccess(status = 401): void {
  mockedAuthenticateBusinessReadAccess.mockResolvedValue(
    NextResponse.json({ error: "Unauthorized" }, { status }),
  );
}

export function createPublicRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}
