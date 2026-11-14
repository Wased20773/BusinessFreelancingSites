/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  USER_ID,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
// Must come after mocks/prisma: it loads getBusinessPlan, which needs mockPrisma.
import { mockBusinessPlan } from "@/__tests__/helpers/billing";
import { LOCATION_SLOTS, PLANS } from "@/lib/billing/plans";

import { GET } from "@/app/api/businesses/[businessId]/billing/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

jest.mock("@/lib/billing/getBusinessPlan", () => ({
  ...jest.requireActual("@/lib/billing/getBusinessPlan"),
  getBusinessPlan: jest.fn(),
}));

const PERIOD_END = new Date("2026-12-12T00:00:00.000Z");

const payer = {
  id: USER_ID,
  name: "Bryan",
  email: "bryan@example.com",
  image: null,
};

// What Prisma returns: the payer plus their membership in this business.
const payerRow = { ...payer, businesses: [{ id: "business-user-1" }] };

function getBillingSummary() {
  return GET(
    createJsonRequest({
      url: `http://localhost/api/businesses/${BUSINESS_ID}/billing`,
      method: "GET",
    }),
    createRouteContext({ businessId: BUSINESS_ID }),
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("GET /api/businesses/[businessId]/billing", () => {
  it("returns the plan, usage, and the subscription for the payer", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("familyBusiness", 3);
    mockPrisma.business.findUnique.mockResolvedValue({
      subscription: {
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        payer: payerRow,
      },
      _count: { locations: 2, users: 4, apiKeys: 1 },
    });

    const response = await getBillingSummary();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      planKey: "familyBusiness",
      limits: PLANS.familyBusiness,
      usage: { locations: 2, locationSlots: 3, members: 4, apiKeys: 1 },
      selfServeSlotCap: LOCATION_SLOTS.selfServeCap,
      subscription: {
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END.toISOString(),
        cancelAtPeriodEnd: false,
        payer,
        isPayer: true,
        payerIsMember: true,
      },
    });
  });

  it("marks payerIsMember false once the payer left the business", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, "owner-1", "owner");
    mockBusinessPlan("familyBusiness");
    mockPrisma.business.findUnique.mockResolvedValue({
      subscription: {
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: true,
        payer: { ...payer, businesses: [] },
      },
      _count: { locations: 1, users: 2, apiKeys: 0 },
    });

    const body = await (await getBillingSummary()).json();

    expect(body.subscription.payerIsMember).toBe(false);
    expect(body.subscription.payer).toEqual(payer);
  });

  it("marks isPayer false for other members", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, "another-member", "staff");
    mockBusinessPlan("familyBusiness");
    mockPrisma.business.findUnique.mockResolvedValue({
      subscription: {
        tier: "familyBusiness",
        status: "active",
        currentPeriodEnd: PERIOD_END,
        cancelAtPeriodEnd: false,
        payer: payerRow,
      },
      _count: { locations: 1, users: 2, apiKeys: 0 },
    });

    const body = await (await getBillingSummary()).json();

    expect(body.subscription.isPayer).toBe(false);
  });

  it("returns a null subscription for a business that never paid", async () => {
    mockSuccessfulAuthentication();
    mockBusinessPlan("free");
    mockPrisma.business.findUnique.mockResolvedValue({
      subscription: null,
      _count: { locations: 1, users: 1, apiKeys: 0 },
    });

    const body = await (await getBillingSummary()).json();

    expect(body.planKey).toBe("free");
    expect(body.subscription).toBeNull();
  });
});
