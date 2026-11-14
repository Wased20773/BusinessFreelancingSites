/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  USER_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { cancelSubscriptionForDepartingPayer } from "@/lib/billing/cancelSubscription";

import { POST } from "@/app/api/businesses/[businessId]/leave/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const context = createRouteContext({ businessId: BUSINESS_ID });

function leave() {
  return POST(
    createJsonRequest({
      url: `http://localhost/api/businesses/${BUSINESS_ID}/leave`,
      method: "POST",
    }),
    context,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("POST /api/businesses/[businessId]/leave", () => {
  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await leave();

    expect(response.status).toBe(401);
    expect(mockPrisma.businessUser.delete).not.toHaveBeenCalled();
  });

  it("returns 403 for the owner, who must transfer ownership first", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "owner");

    const response = await leave();

    expect(response.status).toBe(403);
    expect(cancelSubscriptionForDepartingPayer).not.toHaveBeenCalled();
    expect(mockPrisma.businessUser.delete).not.toHaveBeenCalled();
  });

  it.each(["admin", "staff", "developer"])(
    "lets a %s leave, ending their plan first if they pay for it",
    async (accessLevel) => {
      mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, accessLevel);

      const calls: string[] = [];
      jest.mocked(cancelSubscriptionForDepartingPayer).mockImplementation(
        async () => {
          calls.push("cancel");
        },
      );
      mockPrisma.businessUser.delete.mockImplementation(async () => {
        calls.push("delete");
        return {};
      });

      const response = await leave();

      expect(response.status).toBe(200);
      expect(cancelSubscriptionForDepartingPayer).toHaveBeenCalledWith(
        BUSINESS_ID,
        USER_ID,
      );
      // Only their own membership.
      expect(mockPrisma.businessUser.delete).toHaveBeenCalledWith({
        where: { businessId_userId: { businessId: BUSINESS_ID, userId: USER_ID } },
      });
      expect(calls).toEqual(["cancel", "delete"]);
    },
  );

  it("keeps the membership when ending the plan fails", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "staff");
    jest
      .mocked(cancelSubscriptionForDepartingPayer)
      .mockRejectedValue(new Error("Stripe is down"));

    const response = await leave();

    expect(response.status).toBe(500);
    expect(mockPrisma.businessUser.delete).not.toHaveBeenCalled();
  });
});
