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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/categories/category-123/items`;

const itemBody = {
  name: "Al Pastor Taco",
  description: "Taco with onion and cilantro",
  containsList: ["onion", "cilantro"],
  calories: 250,
  price: 2,
  isAvailable: true,
};

const category = {
  id: "category-123",
  locationId: LOCATION_ID,
  syncGroupId: null,
};

function postItem(body: unknown, categoryId = "category-123") {
  return POST(
    createJsonRequest({ url: URL, method: "POST", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      categoryId,
    }),
  );
}

describe("POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(401);
    expect(mockPrisma.item.create).not.toHaveBeenCalled();
  });

  it("returns 400 when categoryId is missing", async () => {
    const response = await postItem({ ...itemBody, isSynced: false }, "");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing categoryId" });
  });

  it("returns 404 when the location does not belong to the business", async () => {
    mockSuccessfulAuthentication();
    mockLocationNotInBusiness();

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
  });

  it("returns 500 when the request body is not valid JSON", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await POST(
      new Request(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
      createRouteContext({
        businessId: BUSINESS_ID,
        locationId: LOCATION_ID,
        categoryId: "category-123",
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to create category item",
    });
  });

  it.each([
    ["name", "Missing item name"],
    ["price", "Missing item price"],
  ])("returns 400 when the item %s is missing", async (field, error) => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postItem({
      ...itemBody,
      [field]: undefined,
      isSynced: false,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it("returns 400 when the synchronization setting is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postItem(itemBody);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });
  });

  it("returns 500 when finding the category fails", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to create category item",
    });
  });

  it("returns 404 when the category is not found", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "This category does not exist in our records",
    });

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: "category-123", locationId: LOCATION_ID },
      select: { id: true, locationId: true, syncGroupId: true },
    });
  });

  it("returns 409 when an item with the same slug already exists in the location", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(category);
    mockPrisma.item.findFirst.mockResolvedValue({ id: "existing-item" });

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "An item with this name already exists in this location",
    });

    expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
      where: { locationId: LOCATION_ID, slug: "al-pastor-taco" },
      select: { id: true },
    });

    expect(mockPrisma.item.create).not.toHaveBeenCalled();
  });

  it("returns the getNextOrder error response", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(category);
    mockPrisma.item.findFirst
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("Database query failed"));

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to determine the next order",
    });

    expect(mockPrisma.item.create).not.toHaveBeenCalled();
  });

  it("returns 500 when creating the item fails", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(category);
    mockPrisma.item.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.item.create.mockRejectedValue(new Error("Database create failed"));

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to create category item",
    });
  });

  it("successfully creates an item for the category", async () => {
    const createdItem = {
      id: "item-123",
      locationId: LOCATION_ID,
      categoryId: "category-123",
      ...itemBody,
      price: "2",
      order: 4,
      slug: "al-pastor-taco",
      imageKey: null,
      syncGroupId: null,
      isSynced: false,
    };

    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(category);
    mockPrisma.item.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ order: 3 });
    mockPrisma.item.create.mockResolvedValue(createdItem);

    const response = await postItem({ ...itemBody, isSynced: false });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(createdItem);

    expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(2, {
      where: { categoryId: "category-123" },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    expect(mockPrisma.item.create).toHaveBeenCalledWith({
      data: {
        locationId: LOCATION_ID,
        categoryId: "category-123",
        ...itemBody,
        order: 4,
        slug: "al-pastor-taco",
        syncGroupId: null,
        isSynced: false,
      },
      select: {
        id: true,
        locationId: true,
        categoryId: true,
        name: true,
        description: true,
        containsList: true,
        calories: true,
        price: true,
        order: true,
        isAvailable: true,
        slug: true,
        imageKey: true,
        syncGroupId: true,
        isSynced: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  describe("synchronized", () => {
    const syncedCategory = { ...category, syncGroupId: "category-sync-group" };

    it("returns 400 when the category is not in a sync group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(category);

      const response = await postItem({ ...itemBody, isSynced: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This category does not belong to a synchronization group",
      });

      expect(mockPrisma.item.createMany).not.toHaveBeenCalled();
    });

    it("returns 409 when the slug already exists in any synchronized location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(syncedCategory);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "category-123", locationId: LOCATION_ID },
        { id: "category-456", locationId: "location-456" },
      ]);
      mockPrisma.item.findFirst.mockResolvedValue({ id: "existing-item" });

      const response = await postItem({ ...itemBody, isSynced: true });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "An item with this name already exists in one or more synchronized locations",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: {
          slug: "al-pastor-taco",
          locationId: { in: [LOCATION_ID, "location-456"] },
        },
        select: { id: true },
      });
    });

    it("successfully creates the item in every synchronized category", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValueOnce("item-sync-group" as ReturnType<Crypto["randomUUID"]>)
        .mockReturnValueOnce("new-item-a" as ReturnType<Crypto["randomUUID"]>)
        .mockReturnValueOnce("new-item-b" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(syncedCategory);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "category-123", locationId: LOCATION_ID },
        { id: "category-456", locationId: "location-456" },
      ]);
      mockPrisma.item.findFirst.mockResolvedValue(null);
      mockPrisma.item.groupBy.mockResolvedValue([
        { categoryId: "category-123", _max: { order: 3 } },
      ]);
      mockPrisma.item.createMany.mockResolvedValue({ count: 2 });

      const response = await postItem({ ...itemBody, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized category items created successfully",
        count: 2,
        id: "new-item-a",
        syncGroupId: "item-sync-group",
      });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "category-sync-group",
          OR: [{ isSynced: true }, { id: "category-123" }],
        },
        select: { id: true, locationId: true },
      });

      expect(mockPrisma.item.createMany).toHaveBeenCalledWith({
        data: [
          {
            id: "new-item-a",
            locationId: LOCATION_ID,
            categoryId: "category-123",
            ...itemBody,
            order: 4,
            slug: "al-pastor-taco",
            syncGroupId: "item-sync-group",
            isSynced: true,
          },
          {
            id: "new-item-b",
            locationId: "location-456",
            categoryId: "category-456",
            ...itemBody,
            order: 1,
            slug: "al-pastor-taco",
            syncGroupId: "item-sync-group",
            isSynced: true,
          },
        ],
      });

      expect(mockPrisma.item.create).not.toHaveBeenCalled();
    });
  });
});
