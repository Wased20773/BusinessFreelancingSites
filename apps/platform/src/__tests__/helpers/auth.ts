import { BUSINESS_ID, LOCATION_ID, USER_ID } from "@/__tests__/helpers/ids";
import { mockPrisma } from "@/__tests__/mocks/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { NextResponse } from "next/server";

export { BUSINESS_ID, LOCATION_ID, USER_ID };

/*
 * These helpers expect the test file to mock authenticateBusinessAccess:
 *
 * jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
 *   authenticateBusinessAccess: jest.fn(),
 * }));
 */
const mockedAuthenticateBusinessAccess = jest.mocked(
  authenticateBusinessAccess,
);

export function mockSuccessfulAuthentication(
  businessId = BUSINESS_ID,
  userId = USER_ID,
  accessLevel = "owner",
): void {
  mockedAuthenticateBusinessAccess.mockResolvedValue({
    userId,
    businessId,
    accessLevel,
  });
}

export function mockFailedAuthentication(
  status = 401,
  error = "Unauthorized Access",
): void {
  mockedAuthenticateBusinessAccess.mockResolvedValue(
    NextResponse.json({ error }, { status }),
  );
}

/*
 * verifyLocationInBusiness() is the first prisma.location.findFirst call on
 * every /locations/[locationId]/* route.
 */
export function mockLocationInBusiness(locationId = LOCATION_ID): void {
  mockPrisma.location.findFirst.mockResolvedValueOnce({ id: locationId });
}

export function mockLocationNotInBusiness(): void {
  mockPrisma.location.findFirst.mockResolvedValueOnce(null);
}

export const LOCATION_NOT_FOUND = {
  error: "This location does not exist in our records",
};
