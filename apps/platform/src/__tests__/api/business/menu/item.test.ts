/**
 * @jest-environment node
 */

import { createPublicRequest } from "@/__tests__/helpers/publicAuth";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";

import { GET } from "@/app/api/business/menu/items/[itemId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessReadAccess", () => ({
  authenticateBusinessReadAccess: jest.fn(),
}));

const mockedAuthenticateBusinessReadAccess = jest.mocked(
  authenticateBusinessReadAccess,
);

describe("GET /api/business/menu/items/[itemId]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("is disabled and returns 404 without authenticating or querying", async () => {
    const response = await GET(
      createPublicRequest("/api/business/menu/items/item-123"),
      createRouteContext({ itemId: "item-123" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error:
        "This API path is currently being worked on and is therefor disabled. Please try again later",
    });

    expect(mockedAuthenticateBusinessReadAccess).not.toHaveBeenCalled();
    expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
  });

  /*
   * Re-enable these when the route is turned back on (see publicAPI.md:
   * it is planned to look items up by location, category, and item slug).
   */
  it.todo("returns the authentication response when authentication fails");
  it.todo("returns 400 when the item slug is missing");
  it.todo("returns 404 when the item is not found for the authenticated location");
  it.todo("returns 500 when fetching the item fails");
  it.todo("returns the item with its options and a viewable image URL");
  it.todo("only returns the original image URL and sync fields to dashboard sessions");
});
