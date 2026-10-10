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
import { Prisma } from "@business-freelancer/database";

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/subcategory/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/categories/category-123/subcategory`;

const subcategoryBody = {
  name: "Cans",
  description: "(12oz) can drinks",
};

function postSubcategory(body: unknown) {
  return POST(
    createJsonRequest({ url: URL, method: "POST", body }),
    createRouteContext({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      categoryId: "category-123",
    }),
  );
}

describe("POST /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/subcategory", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("returns the authentication error response", async () => {
    mockFailedAuthentication();

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(401);
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("returns 404 when the location does not belong to the business", async () => {
    mockSuccessfulAuthentication();
    mockLocationNotInBusiness();

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
  });

  it("returns 400 when the subcategory name is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postSubcategory({ isSynced: false });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing category name" });
  });

  it("returns 400 when the synchronization setting is missing", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();

    const response = await postSubcategory(subcategoryBody);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });
  });

  it("returns 400 when the parent category does not exist or is already a subcategory", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error:
        "Either the category does not exist in our records or the selected category is already a subcategory",
    });

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: "category-123", locationId: LOCATION_ID, parentId: null },
      select: { id: true, syncGroupId: true },
    });

    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("returns the getNextOrder error response", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: "category-123", syncGroupId: null })
      .mockRejectedValueOnce(new Error("Database query failed"));

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to determine the next order",
    });

    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("returns 409 when a subcategory with the same name already exists", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: "category-123", syncGroupId: null })
      .mockResolvedValueOnce(null);
    mockPrisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "A subcategory with this name already exists under this category",
    });
  });

  it("returns 500 when creating the subcategory fails", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: "category-123", syncGroupId: null })
      .mockResolvedValueOnce(null);
    mockPrisma.category.create.mockRejectedValue(
      new Error("Database create failed"),
    );

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to add a subcategory",
    });
  });

  it("successfully creates a subcategory at the end of the parent's list", async () => {
    const createdSubcategory = {
      id: "subcategory-123",
      locationId: LOCATION_ID,
      parentId: "category-123",
      ...subcategoryBody,
      order: 3,
      isVisible: true,
      syncGroupId: null,
      isSynced: false,
    };

    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst
      .mockResolvedValueOnce({ id: "category-123", syncGroupId: null })
      .mockResolvedValueOnce({ order: 2 });
    mockPrisma.category.create.mockResolvedValue(createdSubcategory);

    const response = await postSubcategory({ ...subcategoryBody, isSynced: false });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(createdSubcategory);

    expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(2, {
      where: { locationId: LOCATION_ID, parentId: "category-123" },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    expect(mockPrisma.category.create).toHaveBeenCalledWith({
      data: {
        locationId: LOCATION_ID,
        parentId: "category-123",
        ...subcategoryBody,
        order: 3,
        syncGroupId: null,
        isSynced: false,
      },
      select: {
        id: true,
        locationId: true,
        parentId: true,
        name: true,
        description: true,
        order: true,
        isVisible: true,
        syncGroupId: true,
        isSynced: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("returns 400 when synced but the parent category is not in a sync group", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue({
      id: "category-123",
      syncGroupId: null,
    });

    const response = await postSubcategory({ ...subcategoryBody, isSynced: true });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "This category does not belong to a synchronization group",
    });

    expect(mockPrisma.category.createMany).not.toHaveBeenCalled();
  });

  it("successfully creates a synchronized subcategory under every synced parent", async () => {
    jest
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("sub-sync-group" as ReturnType<Crypto["randomUUID"]>);

    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.category.findFirst.mockResolvedValue({
      id: "category-123",
      syncGroupId: "parent-sync-group",
    });
    mockPrisma.category.findMany.mockResolvedValue([
      { id: "category-123", locationId: LOCATION_ID },
      { id: "category-456", locationId: "location-456" },
    ]);
    mockPrisma.category.groupBy.mockResolvedValue([
      { parentId: "category-123", _max: { order: 2 } },
    ]);
    mockPrisma.category.createMany.mockResolvedValue({ count: 2 });

    const response = await postSubcategory({ ...subcategoryBody, isSynced: true });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      message: "Synchronized subcategories created successfully",
      count: 2,
      syncGroupId: "sub-sync-group",
    });

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      where: {
        syncGroupId: "parent-sync-group",
        parentId: null,
        OR: [{ isSynced: true }, { id: "category-123" }],
      },
      select: { id: true, locationId: true },
    });

    expect(mockPrisma.category.createMany).toHaveBeenCalledWith({
      data: [
        {
          locationId: LOCATION_ID,
          parentId: "category-123",
          ...subcategoryBody,
          order: 3,
          syncGroupId: "sub-sync-group",
          isSynced: true,
        },
        {
          locationId: "location-456",
          parentId: "category-456",
          ...subcategoryBody,
          order: 1,
          syncGroupId: "sub-sync-group",
          isSynced: true,
        },
      ],
    });
  });
});
