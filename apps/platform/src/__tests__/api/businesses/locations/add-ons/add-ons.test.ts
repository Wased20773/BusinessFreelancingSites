/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  LOCATION_ID,
  mockLocationInBusiness,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/add-ons/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/add-ons/[addOnId]/route";
import { PATCH as MOVE_DOWN } from "@/app/api/businesses/[businessId]/locations/[locationId]/add-ons/[addOnId]/move-down/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/add-ons`;

const groupContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  groupId: "group-1",
});

const addOnContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  addOnId: "ranch",
});

const request = (method: "POST" | "PATCH" | "DELETE", body?: unknown) =>
  createJsonRequest({ url: URL, method, body });

const ranch = {
  name: "Ranch",
  description: " Cool and creamy ",
  calories: 110,
  price: 0.499,
  isAvailable: true,
};

const savedRanch = {
  name: "Ranch",
  description: "Cool and creamy",
  calories: 110,
  price: 0.5,
  isAvailable: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
  mockSuccessfulAuthentication();
  mockLocationInBusiness();
});

describe("POST add-on", () => {
  it.each([
    [{ ...ranch, name: "" }, "Missing add-on name"],
    [{ ...ranch, price: undefined }, "The add-on needs a price of 0 or more"],
    [{ ...ranch, price: -1 }, "The add-on needs a price of 0 or more"],
    [{ ...ranch, calories: 1.5 }, "Calories must be a whole number of 0 or more"],
    [{ ...ranch, description: 5 }, "The add-on description must be text"],
  ])("returns 400 for %j", async (body, error) => {
    const response = await POST(
      request("POST", { ...body, isSynced: false }),
      groupContext,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it("returns 404 for another location's group", async () => {
    mockPrisma.addOnGroup.findFirst.mockResolvedValue(null);

    const response = await POST(
      request("POST", { ...ranch, isSynced: false }),
      groupContext,
    );

    expect(response.status).toBe(404);
  });

  it("creates the add-on at the end of its group, cleaned up", async () => {
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({ id: "group-1", syncGroupId: null });
    mockPrisma.addOn.findFirst.mockResolvedValue({ order: 1 });
    mockPrisma.addOn.create.mockResolvedValue({ id: "ranch" });

    const response = await POST(
      request("POST", { ...ranch, isSynced: false }),
      groupContext,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.addOn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ...savedRanch,
          locationId: LOCATION_ID,
          groupId: "group-1",
          order: 2,
          syncGroupId: null,
          isSynced: false,
        },
      }),
    );
  });

  it("won't sync an add-on in a group that isn't synced", async () => {
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({ id: "group-1", syncGroupId: null });

    const response = await POST(
      request("POST", { ...ranch, isSynced: true }),
      groupContext,
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.addOn.createMany).not.toHaveBeenCalled();
  });

  it("creates a synced add-on in every synced copy of its group", async () => {
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({ id: "group-1", syncGroupId: "sync-g" });
    mockPrisma.addOnGroup.findMany.mockResolvedValue([
      { id: "group-1", locationId: LOCATION_ID, addOns: [{ order: 3 }] },
      { id: "group-b", locationId: "location-b", addOns: [] },
    ]);
    mockPrisma.addOn.createMany.mockResolvedValue({ count: 2 });

    const response = await POST(
      request("POST", { ...ranch, isSynced: true }),
      groupContext,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.addOnGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { syncGroupId: "sync-g", OR: [{ isSynced: true }, { id: "group-1" }] },
      }),
    );

    const rows = mockPrisma.addOn.createMany.mock.calls[0][0].data;

    expect(rows).toEqual([
      expect.objectContaining({ ...savedRanch, groupId: "group-1", locationId: LOCATION_ID, order: 4, isSynced: true }),
      expect.objectContaining({ ...savedRanch, groupId: "group-b", locationId: "location-b", order: 1, isSynced: true }),
    ]);
    expect(rows[0].syncGroupId).toBe(rows[1].syncGroupId);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: rows[0].id }),
    );
  });
});

describe("PATCH add-on", () => {
  it("updates every synced copy when saved synced", async () => {
    mockPrisma.addOn.findFirst
      .mockResolvedValueOnce({
        id: "ranch",
        groupId: "group-1",
        syncGroupId: "sync-ranch",
        group: { syncGroupId: "sync-g" },
      })
      .mockResolvedValueOnce({ id: "ranch" });

    const response = await PATCH(
      request("PATCH", { ...ranch, isSynced: true }),
      addOnContext,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.addOn.updateMany).toHaveBeenCalledWith({
      where: { syncGroupId: "sync-ranch", OR: [{ isSynced: true }, { id: "ranch" }] },
      data: { ...savedRanch, isSynced: true },
    });
  });

  it("syncing a location's own add-on adds it to the other locations' synced groups", async () => {
    mockPrisma.addOn.findFirst
      .mockResolvedValueOnce({
        id: "ranch",
        groupId: "group-1",
        syncGroupId: null,
        group: { syncGroupId: "sync-g" },
      })
      .mockResolvedValueOnce({ id: "ranch" });
    mockPrisma.addOnGroup.findMany.mockResolvedValue([
      { id: "group-b", locationId: "location-b", addOns: [{ order: 2 }] },
    ]);

    const response = await PATCH(
      request("PATCH", { ...ranch, isSynced: true }),
      addOnContext,
    );

    expect(response.status).toBe(200);

    const syncGroupId = mockPrisma.addOn.update.mock.calls[0][0].data.syncGroupId;

    expect(syncGroupId).toEqual(expect.any(String));
    expect(mockPrisma.addOnGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { syncGroupId: "sync-g", isSynced: true, id: { not: "group-1" } },
      }),
    );
    expect(mockPrisma.addOn.createMany).toHaveBeenCalledWith({
      data: [
        {
          ...savedRanch,
          locationId: "location-b",
          groupId: "group-b",
          order: 3,
          syncGroupId,
          isSynced: true,
        },
      ],
    });
  });

  it("won't sync an add-on whose group isn't synced", async () => {
    mockPrisma.addOn.findFirst.mockResolvedValueOnce({
      id: "ranch",
      groupId: "group-1",
      syncGroupId: null,
      group: { syncGroupId: null },
    });

    const response = await PATCH(
      request("PATCH", { ...ranch, isSynced: true }),
      addOnContext,
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.addOn.update).not.toHaveBeenCalled();
  });

  it("unsyncing keeps the syncGroupId and changes only this location", async () => {
    mockPrisma.addOn.findFirst
      .mockResolvedValueOnce({
        id: "ranch",
        groupId: "group-1",
        syncGroupId: "sync-ranch",
        group: { syncGroupId: "sync-g" },
      })
      .mockResolvedValueOnce({ id: "ranch" });

    await PATCH(request("PATCH", { ...ranch, isSynced: false }), addOnContext);

    expect(mockPrisma.addOn.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.addOn.update).toHaveBeenCalledWith({
      where: { id: "ranch" },
      data: { ...savedRanch, isSynced: false },
    });
  });
});

describe("DELETE add-on", () => {
  it("deletes the add-on (items lose it) and renumbers its group", async () => {
    mockPrisma.addOn.findFirst.mockResolvedValue({
      id: "ranch",
      groupId: "group-1",
      syncGroupId: null,
    });
    mockPrisma.addOn.findMany.mockResolvedValue([{ id: "buffalo" }]);

    const response = await DELETE(
      request("DELETE", { deleteAllSynced: false }),
      addOnContext,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.addOn.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["ranch"] } },
    });
    expect(mockPrisma.addOn.update).toHaveBeenCalledWith({
      where: { id: "buffalo" },
      data: { order: 1 },
    });
  });
});

describe("move add-on", () => {
  it("only moves within its own group", async () => {
    mockPrisma.addOn.findFirst
      .mockResolvedValueOnce({ id: "ranch", order: 1, groupId: "group-1" })
      .mockResolvedValueOnce({ id: "buffalo", order: 2 });

    const response = await MOVE_DOWN(request("PATCH"), addOnContext);

    expect(response.status).toBe(200);
    expect(mockPrisma.addOn.findFirst).toHaveBeenLastCalledWith({
      where: { groupId: "group-1", order: { gt: 1 } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
  });
});
