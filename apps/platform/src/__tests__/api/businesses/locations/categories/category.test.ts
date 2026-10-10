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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/categories`;

const locationContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
});

const categoryContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  categoryId: "category-123",
});

function postCategory(body: unknown) {
  return POST(
    createJsonRequest({ url: BASE_URL, method: "POST", body }),
    locationContext,
  );
}

function patchCategory(body: unknown) {
  return PATCH(
    createJsonRequest({ url: `${BASE_URL}/category-123`, method: "PATCH", body }),
    categoryContext,
  );
}

function deleteCategory(body: unknown) {
  return DELETE(
    createJsonRequest({
      url: `${BASE_URL}/category-123`,
      method: "DELETE",
      body,
    }),
    categoryContext,
  );
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("Prisma error", {
    code,
    clientVersion: "test",
  });
}

describe("/api/businesses/[businessId]/locations/[locationId]/categories", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    const categoryBody = {
      name: "Tacos",
      description: "Traditional street tacos",
    };

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized Access" });

      expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the category name is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postCategory({ isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing category name" });

      expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postCategory(categoryBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns the getNextOrder error response", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to determine the next order",
      });

      expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });

    it("returns 409 when a category with the same name already exists", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({ order: 2 });
      mockPrisma.category.create.mockRejectedValue(prismaError("P2002"));

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A category with this name already exists in this location",
      });
    });

    it("returns 500 when creating the category fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({ order: 2 });
      mockPrisma.category.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create category",
      });
    });

    it("successfully creates a category at the end of the location's list", async () => {
      const createdCategory = {
        id: "category-123",
        locationId: LOCATION_ID,
        ...categoryBody,
        order: 3,
        isVisible: true,
        syncGroupId: null,
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({ order: 2 });
      mockPrisma.category.create.mockResolvedValue(createdCategory);

      const response = await postCategory({ ...categoryBody, isSynced: false });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(createdCategory);

      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID, parentId: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: {
          locationId: LOCATION_ID,
          ...categoryBody,
          order: 3,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          locationId: true,
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

    it("returns 400 when synced but the business has no locations", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.location.findMany.mockResolvedValue([]);

      const response = await postCategory({ ...categoryBody, isSynced: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "No locations were found for this business",
      });

      expect(mockPrisma.category.createMany).not.toHaveBeenCalled();
    });

    it("successfully creates a synchronized category at the end of every location's list", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValue("sync-group-123" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.location.findMany.mockResolvedValue([
        { id: LOCATION_ID, categories: [{ order: 4 }] },
        { id: "location-456", categories: [] },
      ]);
      mockPrisma.category.createMany.mockResolvedValue({ count: 2 });

      const response = await postCategory({ ...categoryBody, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized categories created successfully",
        count: 2,
        syncGroupId: "sync-group-123",
      });

      expect(mockPrisma.category.createMany).toHaveBeenCalledWith({
        data: [
          {
            locationId: LOCATION_ID,
            ...categoryBody,
            order: 5,
            syncGroupId: "sync-group-123",
            isSynced: true,
          },
          {
            locationId: "location-456",
            ...categoryBody,
            order: 1,
            syncGroupId: "sync-group-123",
            isSynced: true,
          },
        ],
      });

      expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /[categoryId]", () => {
    const updateBody = {
      name: "Street Tacos",
      description: "Updated description",
      isVisible: false,
    };

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the category name is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchCategory({ isVisible: false, isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing category name" });
    });

    it("returns 404 when the category is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This category does not exist in our records",
      });
    });

    it("returns 409 when another category already uses the name", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        syncGroupId: null,
      });
      mockPrisma.category.update.mockRejectedValue(prismaError("P2002"));

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "A category with this name already exists in this location",
      });
    });

    it("returns 500 when updating the category fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        syncGroupId: null,
      });
      mockPrisma.category.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update category",
      });
    });

    it("successfully updates only the selected category", async () => {
      const updatedCategory = {
        id: "category-123",
        locationId: LOCATION_ID,
        ...updateBody,
        order: 1,
        syncGroupId: null,
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        syncGroupId: null,
      });
      mockPrisma.category.update.mockResolvedValue(updatedCategory);

      const response = await patchCategory({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedCategory);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: "category-123", locationId: LOCATION_ID },
        data: { ...updateBody, isSynced: false },
        select: {
          id: true,
          locationId: true,
          name: true,
          description: true,
          order: true,
          isVisible: true,
          syncGroupId: true,
          isSynced: true,
          updatedAt: true,
        },
      });
    });

    it("successfully updates every synchronized category in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst
        .mockResolvedValueOnce({ id: "category-123", syncGroupId: "sync-group-123" })
        .mockResolvedValueOnce({ id: "category-123", ...updateBody });
      mockPrisma.category.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchCategory({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized category's updated successfully",
        id: "category-123",
        ...updateBody,
      });

      expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "category-123" }],
        },
        data: { ...updateBody, isSynced: true },
      });
    });
  });

  describe("DELETE /[categoryId]", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteCategory({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the category is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This category does not exist in our records",
      });

      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it("returns 409 when the category still has items attached", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: null,
        items: [{ id: "item-123" }],
      });

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This category cannot be deleted because it still has items attached to it",
      });

      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it("returns 409 when the category still has subcategories", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: null,
        items: [],
      });
      mockPrisma.category.delete.mockRejectedValue(prismaError("P2003"));

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "This category cannot be deleted while it still has subcategories.",
      });
    });

    it("returns 500 when deleting the category fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: null,
        items: [],
      });
      mockPrisma.category.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete category",
      });
    });

    it("successfully deletes the category and reorders the remaining categories", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: null,
        items: [],
      });
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "category-456" },
        { id: "category-789" },
      ]);

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Category deleted successfully",
      });

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: "category-123", locationId: LOCATION_ID },
      });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID, parentId: null },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(1, {
        where: { id: "category-456" },
        data: { order: 1 },
      });

      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(2, {
        where: { id: "category-789" },
        data: { order: 2 },
      });
    });

    it("reorders only the sibling subcategories when deleting a subcategory", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: "parent-category",
        syncGroupId: null,
        items: [],
      });
      mockPrisma.category.findMany.mockResolvedValue([{ id: "subcategory-2" }]);

      const response = await deleteCategory({ deleteAllSynced: false });

      expect(response.status).toBe(200);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID, parentId: "parent-category" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: "subcategory-2" },
        data: { order: 1 },
      });
    });

    it("returns 409 when any synchronized category in the group still has items", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: "sync-group-123",
        items: [],
      });
      mockPrisma.category.findMany.mockResolvedValue([
        { id: "category-123", locationId: LOCATION_ID, parentId: null, items: [] },
        {
          id: "category-456",
          locationId: "location-456",
          parentId: null,
          items: [{ id: "item-456" }],
        },
      ]);

      const response = await deleteCategory({ deleteAllSynced: true });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "These categories cannot be deleted because one or more still have items attached",
      });

      expect(mockPrisma.category.deleteMany).not.toHaveBeenCalled();
    });

    it("successfully deletes every synchronized category and reorders each location", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue({
        id: "category-123",
        locationId: LOCATION_ID,
        parentId: null,
        syncGroupId: "sync-group-123",
        items: [],
      });
      mockPrisma.category.findMany
        .mockResolvedValueOnce([
          { id: "category-123", locationId: LOCATION_ID, parentId: null, items: [] },
          {
            id: "category-456",
            locationId: "location-456",
            parentId: null,
            items: [],
          },
        ])
        .mockResolvedValueOnce([{ id: "remaining-a" }])
        .mockResolvedValueOnce([{ id: "remaining-b" }]);

      const response = await deleteCategory({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized categories deleted successfully",
      });

      expect(mockPrisma.category.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          syncGroupId: "sync-group-123",
          OR: [{ isSynced: true }, { id: "category-123" }],
        },
        select: {
          id: true,
          locationId: true,
          parentId: true,
          items: { select: { id: true } },
        },
      });

      expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["category-123", "category-456"] } },
      });

      expect(mockPrisma.category.findMany).toHaveBeenNthCalledWith(2, {
        where: { locationId: LOCATION_ID, parentId: null },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.category.findMany).toHaveBeenNthCalledWith(3, {
        where: { locationId: "location-456", parentId: null },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
