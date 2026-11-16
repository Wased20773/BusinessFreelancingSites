/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  LOCATION_ID,
  LOCATION_NOT_FOUND,
  mockFailedAuthentication,
  mockLocationInBusiness,
  mockLocationNotInBusiness,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { Prisma } from "@business-freelancer/database";

import {
  GET,
  POST,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/add-on-groups/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/route";
import { PATCH as MOVE_UP } from "@/app/api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/move-up/route";
import { PATCH as MOVE_DOWN } from "@/app/api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/move-down/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/add-on-groups`;

const locationContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const groupContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  groupId: "group-1",
});

const request = (method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) =>
  createJsonRequest({ url: BASE_URL, method, body });

const uniqueError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique", {
    code: "P2002",
    clientVersion: "test",
  });

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

describe("GET add-on groups", () => {
  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await GET(request("GET"), locationContext);

    expect(response.status).toBe(401);
    expect(mockPrisma.addOnGroup.findMany).not.toHaveBeenCalled();
  });

  it("lets staff view the add-ons", async () => {
    mockSuccessfulAuthentication(BUSINESS_ID, "user-1", "staff");
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findMany.mockResolvedValue([]);

    await GET(request("GET"), locationContext);

    expect(jest.mocked(authenticateBusinessAccess)).toHaveBeenCalledWith(
      expect.any(Request),
      BUSINESS_ID,
      ["owner", "admin", "staff"],
    );
  });

  it("counts each item using an add-on once, even across its options", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findMany.mockResolvedValue([
      {
        id: "group-1",
        name: "Sauces",
        addOns: [
          {
            id: "ranch",
            name: "Ranch",
            itemLinks: [{ itemId: "taco" }],
            optionLinks: [
              { option: { itemId: "taco" } },
              { option: { itemId: "burrito" } },
            ],
          },
        ],
      },
    ]);

    const response = await GET(request("GET"), locationContext);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      groups: [
        {
          id: "group-1",
          name: "Sauces",
          addOns: [{ id: "ranch", name: "Ranch", usedByItems: 2 }],
        },
      ],
    });
  });
});

describe("POST add-on group", () => {
  it("returns 404 when the location isn't in the business", async () => {
    mockSuccessfulAuthentication();
    mockLocationNotInBusiness();

    const response = await POST(
      request("POST", { name: "Sauces", isSynced: false }),
      locationContext,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
  });

  it.each([
    [{ isSynced: false }, "Missing add-on group name"],
    [{ name: "   ", isSynced: false }, "Missing add-on group name"],
    [{ name: "Sauces" }, "Synchronization setting was not found"],
  ])("returns 400 for %j", async (body, error) => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await POST(request("POST", body), locationContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it("creates the group at the end of this location's list", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({ order: 2 });
    mockPrisma.addOnGroup.create.mockResolvedValue({ id: "group-1" });

    const response = await POST(
      request("POST", { name: " Sauces ", isSynced: false }),
      locationContext,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.addOnGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          locationId: LOCATION_ID,
          name: "Sauces",
          order: 3,
          syncGroupId: null,
          isSynced: false,
        },
      }),
    );
  });

  it("creates a synced group at every location, each with its own order", async () => {
    jest
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("sync-1" as ReturnType<Crypto["randomUUID"]>);
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.location.findMany.mockResolvedValue([
      { id: LOCATION_ID, addOnGroups: [{ order: 2 }] },
      { id: "location-b", addOnGroups: [] },
    ]);
    mockPrisma.addOnGroup.createMany.mockResolvedValue({ count: 2 });

    const response = await POST(
      request("POST", { name: "Sauces", isSynced: true }),
      locationContext,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.addOnGroup.createMany).toHaveBeenCalledWith({
      data: [
        { locationId: LOCATION_ID, name: "Sauces", order: 3, syncGroupId: "sync-1", isSynced: true },
        { locationId: "location-b", name: "Sauces", order: 1, syncGroupId: "sync-1", isSynced: true },
      ],
    });
  });

  it("returns 409 when the name is taken", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst.mockResolvedValue(null);
    mockPrisma.addOnGroup.create.mockRejectedValue(uniqueError());

    const response = await POST(
      request("POST", { name: "Sauces", isSynced: false }),
      locationContext,
    );

    expect(response.status).toBe(409);
  });
});

describe("PATCH add-on group", () => {
  it("returns 404 for another location's group", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst.mockResolvedValue(null);

    const response = await PATCH(
      request("PATCH", { name: "Dips", isSynced: false }),
      groupContext,
    );

    expect(response.status).toBe(404);
    expect(mockPrisma.addOnGroup.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "group-1", locationId: LOCATION_ID } }),
    );
  });

  it("renames every synced copy when saved synced", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst
      .mockResolvedValueOnce({ id: "group-1", syncGroupId: "sync-1" })
      .mockResolvedValueOnce({ id: "group-1", name: "Dips" });

    const response = await PATCH(
      request("PATCH", { name: "Dips", isSynced: true }),
      groupContext,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.addOnGroup.updateMany).toHaveBeenCalledWith({
      where: {
        syncGroupId: "sync-1",
        OR: [{ isSynced: true }, { id: "group-1" }],
      },
      data: { name: "Dips", isSynced: true },
    });
  });

  it("renames only this location's group when saved unsynced", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst
      .mockResolvedValueOnce({ id: "group-1", syncGroupId: "sync-1" })
      .mockResolvedValueOnce({ id: "group-1" });

    await PATCH(request("PATCH", { name: "Dips", isSynced: false }), groupContext);

    expect(mockPrisma.addOnGroup.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.addOnGroup.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: { name: "Dips", isSynced: false },
    });
  });
});

describe("DELETE add-on group", () => {
  it("returns 400 without the delete synchronization option", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await DELETE(request("DELETE", {}), groupContext);

    expect(response.status).toBe(400);
  });

  it("deletes the group even with add-ons inside, then renumbers the rest", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({
      id: "group-1",
      locationId: LOCATION_ID,
      syncGroupId: null,
    });
    mockPrisma.addOnGroup.findMany.mockResolvedValue([{ id: "group-2" }]);

    const response = await DELETE(
      request("DELETE", { deleteAllSynced: false }),
      groupContext,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.addOnGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["group-1"] } },
    });
    expect(mockPrisma.addOnGroup.update).toHaveBeenCalledWith({
      where: { id: "group-2" },
      data: { order: 1 },
    });
  });

  it("deletes every synced copy when asked", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst.mockResolvedValue({
      id: "group-1",
      locationId: LOCATION_ID,
      syncGroupId: "sync-1",
    });
    mockPrisma.addOnGroup.findMany
      .mockResolvedValueOnce([
        { id: "group-1", locationId: LOCATION_ID },
        { id: "group-b", locationId: "location-b" },
      ])
      .mockResolvedValue([]);

    const response = await DELETE(
      request("DELETE", { deleteAllSynced: true }),
      groupContext,
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.addOnGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["group-1", "group-b"] } },
    });
  });
});

describe("move add-on group", () => {
  it("swaps the group with the one above it", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst
      .mockResolvedValueOnce({ id: "group-1", order: 2, locationId: LOCATION_ID })
      .mockResolvedValueOnce({ id: "group-0", order: 1 });

    const response = await MOVE_UP(request("PATCH"), groupContext);

    expect(response.status).toBe(200);
    expect(mockPrisma.addOnGroup.findFirst).toHaveBeenLastCalledWith({
      where: { locationId: LOCATION_ID, order: { lt: 2 } },
      orderBy: { order: "desc" },
      select: { id: true, order: true },
    });
    expect(mockPrisma.addOnGroup.update).toHaveBeenCalledWith({
      where: { id: "group-1" },
      data: { order: 1 },
    });
    expect(mockPrisma.addOnGroup.update).toHaveBeenCalledWith({
      where: { id: "group-0" },
      data: { order: 2 },
    });
  });

  it("returns 400 when the group is already at the bottom", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.addOnGroup.findFirst
      .mockResolvedValueOnce({ id: "group-1", order: 3, locationId: LOCATION_ID })
      .mockResolvedValueOnce(null);

    const response = await MOVE_DOWN(request("PATCH"), groupContext);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "This add-on group is already at the bottom",
    });
  });
});
