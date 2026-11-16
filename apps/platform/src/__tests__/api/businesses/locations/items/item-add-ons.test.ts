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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/route";
import { PATCH } from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/route";

/*
 * Saving add-ons with an item (create and edit). The add-on routes
 * themselves are tested in ../add-ons; the link helpers in lib/addOns.
 */

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}`;

const itemBody = {
  name: "Pizza",
  description: null,
  containsList: [],
  calories: null,
  price: 0,
  isAvailable: true,
};

function postItem(body: unknown) {
  return POST(
    createJsonRequest({ url: `${BASE}/categories/category-1/items`, method: "POST", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      categoryId: "category-1",
    }),
  );
}

function patchItem(body: unknown) {
  return PATCH(
    createJsonRequest({ url: `${BASE}/items/item-1`, method: "PATCH", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      itemId: "item-1",
    }),
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
  mockSuccessfulAuthentication();
  mockLocationInBusiness();
});

describe("creating an item with add-ons", () => {
  it("returns 400 for an add-on from another location, before saving anything", async () => {
    mockPrisma.addOn.count.mockResolvedValue(0);

    const response = await postItem({
      ...itemBody,
      isSynced: false,
      addOns: [{ addOnId: "other-location-ranch" }],
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "An add-on in the list does not belong to this location",
    });
    expect(mockPrisma.item.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid add-on list on an option", async () => {
    const response = await postItem({
      ...itemBody,
      isSynced: false,
      options: [{ name: "Large", price: 14, addOns: "ranch" }],
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: '"Large": Add-ons must be an array',
    });
  });

  it("links the item's and each option's add-ons in the item's transaction", async () => {
    mockPrisma.addOn.count.mockResolvedValue(2);
    mockPrisma.category.findFirst.mockResolvedValue({
      id: "category-1",
      locationId: LOCATION_ID,
      syncGroupId: null,
    });
    mockPrisma.item.findFirst.mockResolvedValue(null);
    mockPrisma.item.create.mockResolvedValue({ id: "item-1" });

    const response = await postItem({
      ...itemBody,
      isSynced: false,
      addOnsVaryByOption: true,
      addOns: [{ addOnId: "ranch" }],
      options: [{ name: "Large", price: 14, addOns: [{ addOnId: "pepperoni", price: 2 }] }],
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    const createData = mockPrisma.item.create.mock.calls[0][0].data;
    const optionId = createData.options.createMany.data[0].id;

    expect(createData.addOnsVaryByOption).toBe(true);
    expect(mockPrisma.itemAddOn.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item-1", addOnId: "ranch", price: null, order: 1 }],
    });
    expect(mockPrisma.itemOptionAddOn.createMany).toHaveBeenCalledWith({
      data: [{ optionId, addOnId: "pepperoni", price: 2, order: 1 }],
    });
  });
});

describe("editing an item's add-ons", () => {
  function mockItem(overrides: Record<string, unknown> = {}) {
    mockPrisma.item.findFirst
      .mockResolvedValueOnce({
        id: "item-1",
        locationId: LOCATION_ID,
        syncGroupId: null,
        isSynced: false,
        imageKey: null,
        originalImageKey: null,
        ...overrides,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "item-1" });
  }

  it("leaves the add-ons alone when they aren't sent", async () => {
    mockItem();

    const response = await patchItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(200);
    expect(mockPrisma.itemAddOn.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ addOnsVaryByOption: expect.anything() }),
      }),
    );
  });

  it("saves the setting and replaces the item's list", async () => {
    mockItem();
    mockPrisma.addOn.count.mockResolvedValue(1);

    const response = await patchItem({
      ...itemBody,
      isSynced: false,
      addOnsVaryByOption: false,
      addOns: [{ addOnId: "cheese", price: 1 }],
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ addOnsVaryByOption: false }),
      }),
    );
    expect(mockPrisma.itemAddOn.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "item-1" },
    });
    expect(mockPrisma.itemAddOn.createMany).toHaveBeenCalledWith({
      data: [{ itemId: "item-1", addOnId: "cheese", price: 1, order: 1 }],
    });
  });

  it("saves each option's list on that option, including a new one", async () => {
    mockItem();
    // Both options use the same add-on: one unique id.
    mockPrisma.addOn.count.mockResolvedValue(1);
    mockPrisma.itemOption.findMany.mockResolvedValue([
      { id: "small", syncGroupId: null },
    ]);

    const response = await patchItem({
      ...itemBody,
      isSynced: false,
      addOnsVaryByOption: true,
      options: [
        { id: "small", name: "Small", price: 10, addOns: [{ addOnId: "pepperoni", price: 1 }] },
        { name: "Large", price: 14, addOns: [{ addOnId: "pepperoni", price: 2 }] },
      ],
    });

    expect(response.status).toBe(200);

    const newOptionId = mockPrisma.itemOption.create.mock.calls[0][0].data.id;

    expect(mockPrisma.itemOptionAddOn.createMany).toHaveBeenCalledWith({
      data: [{ optionId: "small", addOnId: "pepperoni", price: 1, order: 1 }],
    });
    expect(mockPrisma.itemOptionAddOn.createMany).toHaveBeenCalledWith({
      data: [{ optionId: newOptionId, addOnId: "pepperoni", price: 2, order: 1 }],
    });
  });

  it("copies the links to synced copies on a synced save", async () => {
    mockItem({ syncGroupId: "item-sync", isSynced: true });
    mockPrisma.item.findMany
      .mockResolvedValueOnce([
        { id: "item-1", locationId: LOCATION_ID, imageKey: null, originalImageKey: null, isSynced: true },
        { id: "item-b", locationId: "location-b", imageKey: null, originalImageKey: null, isSynced: true },
      ])
      .mockResolvedValue([]);
    mockPrisma.item.findUnique.mockResolvedValue({ addOns: [], options: [] });

    const response = await patchItem({
      ...itemBody,
      isSynced: true,
      addOns: [],
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.item.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1" } }),
    );
  });
});
