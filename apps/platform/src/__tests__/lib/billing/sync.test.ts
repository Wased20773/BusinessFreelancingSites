/**
 * @jest-environment node
 */
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { mockBusinessPlan } from "@/__tests__/helpers/billing";
import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// jest.setup.ts fakes allowSync as "always allowed"; test the real one here.
jest.mock("@/lib/billing/sync", () => jest.requireActual("@/lib/billing/sync"));

jest.mock("@/lib/billing/getBusinessPlan", () => ({
  ...jest.requireActual("@/lib/billing/getBusinessPlan"),
  getBusinessPlan: jest.fn(),
}));

import { allowSync } from "@/lib/billing/sync";
import {
  createSyncedResource,
  updateSyncedResource,
  deleteSyncedResource,
} from "@/app/api/route_helper";

const mockedGetBusinessPlan = jest.mocked(getBusinessPlan);

const PAID_PLANS = (Object.keys(PLANS) as PlanKey[]).filter(
  (planKey) => planKey !== "free",
);

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("allowSync", () => {
  it("returns false without looking up the plan when sync was not requested", async () => {
    expect(await allowSync("business-123", false)).toBe(false);
    expect(mockedGetBusinessPlan).not.toHaveBeenCalled();
  });

  it("returns false on the Free plan", async () => {
    mockBusinessPlan("free");

    expect(await allowSync("business-123", true)).toBe(false);
    expect(mockedGetBusinessPlan).toHaveBeenCalledWith("business-123");
  });

  it.each(PAID_PLANS)("returns true on the %s plan", async (planKey) => {
    mockBusinessPlan(planKey);

    expect(await allowSync("business-123", true)).toBe(true);
  });

  it("every paid plan includes sync and Free does not", () => {
    expect(PLANS.free.sync).toBe(false);

    for (const planKey of PAID_PLANS) {
      expect(PLANS[planKey].sync).toBe(true);
    }
  });
});

describe("shared sync helpers on the Free plan", () => {
  beforeEach(() => {
    mockBusinessPlan("free");
  });

  it("creates a synced request only in the selected location", async () => {
    mockPrisma.contact.create.mockResolvedValue({ id: "contact-123" });

    const response = await createSyncedResource({
      body: { isSynced: true },
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      locationId: "location-123",
      data: { phoneNumber: "503-555-1234" },
      select: { id: true },
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.contact.create).toHaveBeenCalledWith({
      data: {
        phoneNumber: "503-555-1234",
        locationId: "location-123",
        syncGroupId: null,
        isSynced: false,
      },
      select: { id: true },
    });

    expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.contact.createMany).not.toHaveBeenCalled();
  });

  it("updates only the edited record and keeps its syncGroupId so it can rejoin", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({
      id: "contact-123",
      syncGroupId: "sync-group-123",
    });
    mockPrisma.contact.update.mockResolvedValue({ id: "contact-123" });

    const response = await updateSyncedResource({
      body: { isSynced: true },
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      id: "contact-123",
      locationId: "location-123",
      data: { phoneNumber: "503-555-9876" },
      select: { id: true, syncGroupId: true },
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();

    // syncGroupId is not in the written data, so it is left as it was.
    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-123", locationId: "location-123" },
      data: { phoneNumber: "503-555-9876", isSynced: false },
      select: { id: true, syncGroupId: true },
    });
  });

  it("deletes only the selected record when deleteAllSynced is requested", async () => {
    mockPrisma.social.findFirst.mockResolvedValue({
      id: "social-123",
      syncGroupId: "sync-group-123",
    });

    const response = await deleteSyncedResource({
      body: { deleteAllSynced: true },
      model: mockPrisma.social as never,
      resourceName: "social",
      businessId: "business-123",
      id: "social-123",
      locationId: "location-123",
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.social.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.social.delete).toHaveBeenCalledWith({
      where: { id: "social-123", locationId: "location-123" },
    });
  });
});
