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
import { copyObject } from "@/lib/s3/copy";
import { deleteObject } from "@/lib/s3/delete";

import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const mockedCopyObject = jest.mocked(copyObject);
const mockedDeleteObject = jest.mocked(deleteObject);

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/items/item-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  itemId: "item-123",
});

const PRIVATE_IMAGE = `businesses/${BUSINESS_ID}/items/image-item-123.webp`;
const PRIVATE_ORIGINAL = `businesses/${BUSINESS_ID}/items/original-item-123.png`;
const SHARED_IMAGE = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/image.webp`;
const SHARED_ORIGINAL = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/original.png`;

const updateBody = {
  name: "Al Pastor Taco",
  description: "Updated description",
  containsList: ["onion"],
  calories: 300,
  price: 3,
  isAvailable: true,
};

const itemSelect = {
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
  originalImageKey: true,
  syncGroupId: true,
  isSynced: true,
  updatedAt: true,
};

function existingItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-123",
    locationId: LOCATION_ID,
    syncGroupId: null,
    isSynced: false,
    imageKey: null,
    originalImageKey: null,
    ...overrides,
  };
}

function patchItem(body: unknown) {
  return PATCH(createJsonRequest({ url: URL, method: "PATCH", body }), context);
}

function deleteItem(body: unknown) {
  return DELETE(createJsonRequest({ url: URL, method: "DELETE", body }), context);
}

describe("/api/businesses/[businessId]/locations/[locationId]/items/[itemId]", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("PATCH", () => {
    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it.each([
      [{ name: undefined }, "Missing item name"],
      [{ price: undefined }, "Missing item price"],
      [{ containsList: "onion" }, "Item contains list must be an array"],
    ])("returns 400 for an invalid body %p", async (overrides, error) => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchItem({
        ...updateBody,
        ...overrides,
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchItem(updateBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item does not exist in our records",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        select: {
          id: true,
          locationId: true,
          syncGroupId: true,
          isSynced: true,
          imageKey: true,
          originalImageKey: true,
        },
      });
    });

    it("returns 409 when the new name clashes with another item's slug", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem())
        .mockResolvedValueOnce({ id: "other-item" });

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error:
          "An item with this name already exists in one or more affected locations",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          slug: "al-pastor-taco",
          locationId: { in: [LOCATION_ID] },
          id: { notIn: ["item-123"] },
        },
        select: { id: true },
      });

      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("returns 500 when updating the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem())
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingItem());
      mockPrisma.item.update.mockRejectedValue(new Error("Database update failed"));

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Failed to update item" });
    });

    it("successfully updates the item and regenerates its slug", async () => {
      const updatedItem = {
        id: "item-123",
        ...updateBody,
        slug: "al-pastor-taco",
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(existingItem())
        .mockResolvedValueOnce(null)
        // The saved item, read back inside the transaction.
        .mockResolvedValueOnce(updatedItem);

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedItem);

      expect(mockPrisma.item.update).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: {
          ...updateBody,
          slug: "al-pastor-taco",
          imageKey: null,
          originalImageKey: null,
          isSynced: false,
        },
      });
      expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(3, {
        where: { id: "item-123", locationId: LOCATION_ID },
        select: itemSelect,
      });

      // No options in the body: the item's options aren't touched.
      expect(mockPrisma.itemOption.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.itemOption.delete).not.toHaveBeenCalled();

      expect(mockedCopyObject).not.toHaveBeenCalled();
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("gives the item its own copy of the shared image when it is un-synced", async () => {
      const syncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: true,
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(syncedItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(syncedItem);
      mockPrisma.item.update.mockResolvedValue({ id: "item-123" });

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);

      expect(mockedCopyObject).toHaveBeenCalledWith(SHARED_IMAGE, PRIVATE_IMAGE);
      expect(mockedCopyObject).toHaveBeenCalledWith(
        SHARED_ORIGINAL,
        PRIVATE_ORIGINAL,
      );

      expect(mockPrisma.item.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageKey: PRIVATE_IMAGE,
            originalImageKey: PRIVATE_ORIGINAL,
            isSynced: false,
          }),
        }),
      );

      // The shared objects are still used by the rest of the group.
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("deletes the copied images when the database update fails after un-syncing", async () => {
      const syncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: true,
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(syncedItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const response = await patchItem({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
    });

    it("switches to the group's shared image and deletes its private image when re-synced", async () => {
      const unsyncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: false,
        imageKey: PRIVATE_IMAGE,
        originalImageKey: PRIVATE_ORIGINAL,
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(unsyncedItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(unsyncedItem)
        .mockResolvedValueOnce({ id: "item-123" });
      mockPrisma.item.findMany.mockResolvedValue([
        {
          id: "item-123",
          locationId: LOCATION_ID,
          imageKey: PRIVATE_IMAGE,
          originalImageKey: PRIVATE_ORIGINAL,
          isSynced: false,
        },
        {
          id: "item-456",
          locationId: "location-456",
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
          isSynced: true,
        },
      ]);
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchItem({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        data: {
          ...updateBody,
          slug: "al-pastor-taco",
          imageKey: SHARED_IMAGE,
          originalImageKey: SHARED_ORIGINAL,
          isSynced: true,
        },
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
      expect(mockedCopyObject).not.toHaveBeenCalled();
    });

    it("copies its image to the shared key when re-synced into a group without an image", async () => {
      const unsyncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: false,
        imageKey: PRIVATE_IMAGE,
        originalImageKey: PRIVATE_ORIGINAL,
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(unsyncedItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(unsyncedItem)
        .mockResolvedValueOnce({ id: "item-123" });
      mockPrisma.item.findMany.mockResolvedValue([
        {
          id: "item-123",
          locationId: LOCATION_ID,
          imageKey: PRIVATE_IMAGE,
          originalImageKey: PRIVATE_ORIGINAL,
          isSynced: false,
        },
        {
          id: "item-456",
          locationId: "location-456",
          imageKey: null,
          originalImageKey: null,
          isSynced: true,
        },
      ]);
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchItem({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);

      expect(mockedCopyObject).toHaveBeenCalledWith(PRIVATE_IMAGE, SHARED_IMAGE);
      expect(mockedCopyObject).toHaveBeenCalledWith(
        PRIVATE_ORIGINAL,
        SHARED_ORIGINAL,
      );

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageKey: SHARED_IMAGE,
            originalImageKey: SHARED_ORIGINAL,
          }),
        }),
      );

      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
    });

    it("successfully updates every synchronized item and keeps the shared image", async () => {
      const syncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: true,
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(syncedItem)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "item-123", name: updateBody.name });
      mockPrisma.item.findMany.mockResolvedValue([
        { ...syncedItem },
        { ...syncedItem, id: "item-456", locationId: "location-456" },
      ]);
      mockPrisma.item.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchItem({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized item's updated successfully",
        id: "item-123",
        name: updateBody.name,
      });

      expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          slug: "al-pastor-taco",
          locationId: { in: [LOCATION_ID, "location-456"] },
          id: { notIn: ["item-123", "item-456"] },
        },
        select: { id: true },
      });

      expect(mockPrisma.item.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageKey: SHARED_IMAGE,
            originalImageKey: SHARED_ORIGINAL,
            isSynced: true,
          }),
        }),
      );

      expect(mockedCopyObject).not.toHaveBeenCalled();
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    describe("with options (saved together with the item)", () => {
      const syncedItem = existingItem({
        syncGroupId: "item-sync-group",
        isSynced: true,
      });

      it.each([
        ["not an array", "Item options must be an array"],
        [[{ name: "Bacon" }], '"Bacon" needs a price of 0 or more'],
        [[{ name: " ", price: 1 }], "Every option needs a name"],
        [
          [
            { name: "Bacon", price: 1 },
            { name: "bacon", price: 2 },
          ],
          'Two options are named "bacon"',
        ],
      ])("returns 400 for invalid options %p", async (options, error) => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();

        const response = await patchItem({
          ...updateBody,
          isSynced: false,
          options,
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error });
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it("returns 400 when an option id isn't one of this item's options", async () => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();
        mockPrisma.item.findFirst
          .mockResolvedValueOnce(existingItem())
          .mockResolvedValueOnce(null);
        mockPrisma.itemOption.findMany.mockResolvedValue([
          { id: "option-a", syncGroupId: null },
        ]);

        const response = await patchItem({
          ...updateBody,
          isSynced: false,
          options: [{ id: "someone-elses-option", name: "Bacon", price: 1 }],
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          error: "An option in the list does not belong to this item",
        });
        expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
        expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
      });

      it("deletes, updates, and creates options in one transaction, in the sent order", async () => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();
        mockPrisma.item.findFirst
          .mockResolvedValueOnce(existingItem())
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "item-123" });
        mockPrisma.itemOption.findMany.mockResolvedValue([
          { id: "option-a", syncGroupId: null },
          { id: "option-b", syncGroupId: null },
        ]);

        const response = await patchItem({
          ...updateBody,
          isSynced: false,
          options: [
            { id: "option-b", name: "Large", price: 2, isAvailable: false },
            { name: "Bacon", price: 1.5 },
          ],
        });

        expect(response.status).toBe(200);
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

        // Removed from the list → deleted.
        expect(mockPrisma.itemOption.delete).toHaveBeenCalledWith({
          where: { id: "option-a" },
        });

        // Kept → updated, now first.
        expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
          where: { id: "option-b" },
          data: {
            name: "Large",
            price: 2,
            isAvailable: false,
            order: 1,
            isSynced: false,
          },
        });

        // New → created second, only on this item.
        expect(mockPrisma.itemOption.create).toHaveBeenCalledWith({
          data: {
            itemId: "item-123",
            name: "Bacon",
            price: 1.5,
            order: 2,
            isAvailable: true,
            syncGroupId: null,
            isSynced: false,
          },
        });

        expect(mockPrisma.itemOption.updateMany).not.toHaveBeenCalled();
        expect(mockPrisma.itemOption.createMany).not.toHaveBeenCalled();
      });

      it("applies option changes to every synced copy of the item", async () => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();
        mockPrisma.item.findFirst
          .mockResolvedValueOnce(syncedItem)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "item-123" });
        mockPrisma.item.findMany.mockResolvedValue([
          { ...syncedItem },
          { ...syncedItem, id: "item-456", locationId: "location-456" },
        ]);
        mockPrisma.itemOption.findMany
          // This item's options.
          .mockResolvedValueOnce([
            { id: "option-a", syncGroupId: "option-group-a" },
            { id: "option-b", syncGroupId: "option-group-b" },
          ])
          // The copy's remaining options, to renumber.
          .mockResolvedValueOnce([{ id: "copy-option-a" }]);

        const response = await patchItem({
          ...updateBody,
          isSynced: true,
          options: [
            { id: "option-a", name: "Small", price: 0 },
            { name: "Bacon", price: 1 },
          ],
        });

        expect(response.status).toBe(200);

        // Removed: every synced copy of the option goes.
        expect(mockPrisma.itemOption.deleteMany).toHaveBeenCalledWith({
          where: {
            syncGroupId: "option-group-b",
            OR: [{ isSynced: true }, { id: "option-b" }],
          },
        });

        // Updated here, and the same change on its synced copies.
        expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
          where: { id: "option-a" },
          data: {
            name: "Small",
            price: 0,
            isAvailable: true,
            order: 1,
            isSynced: true,
          },
        });
        expect(mockPrisma.itemOption.updateMany).toHaveBeenCalledWith({
          where: {
            syncGroupId: "option-group-a",
            isSynced: true,
            id: { not: "option-a" },
          },
          data: { name: "Small", price: 0, isAvailable: true },
        });

        // New: on this item and on the copy, sharing one sync group.
        const createdHere = mockPrisma.itemOption.create.mock.calls[0][0].data;

        expect(createdHere).toEqual(
          expect.objectContaining({
            itemId: "item-123",
            name: "Bacon",
            order: 2,
            isSynced: true,
            syncGroupId: expect.any(String),
          }),
        );

        // The copy's list is renumbered, then the new option goes last.
        expect(mockPrisma.itemOption.findMany).toHaveBeenNthCalledWith(2, {
          where: { itemId: "item-456" },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
          where: { id: "copy-option-a" },
          data: { order: 1 },
        });
        expect(mockPrisma.itemOption.createMany).toHaveBeenCalledWith({
          data: [
            {
              itemId: "item-456",
              name: "Bacon",
              price: 1,
              order: 2,
              isAvailable: true,
              syncGroupId: createdHere.syncGroupId,
              isSynced: true,
            },
          ],
        });
      });

      it("keeps option changes on this item only when saved unsynced", async () => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();
        mockPrisma.item.findFirst
          .mockResolvedValueOnce(syncedItem)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "item-123" });
        mockPrisma.itemOption.findMany.mockResolvedValue([
          { id: "option-a", syncGroupId: "option-group-a" },
        ]);

        const response = await patchItem({
          ...updateBody,
          isSynced: false,
          options: [],
        });

        expect(response.status).toBe(200);

        // Only this item's copy of the option is deleted.
        expect(mockPrisma.itemOption.delete).toHaveBeenCalledWith({
          where: { id: "option-a" },
        });
        expect(mockPrisma.itemOption.deleteMany).not.toHaveBeenCalled();
      });

      it("returns 500 and saves nothing when an option write fails", async () => {
        mockSuccessfulAuthentication();
        mockLocationInBusiness();
        mockPrisma.item.findFirst
          .mockResolvedValueOnce(existingItem())
          .mockResolvedValueOnce(null);
        mockPrisma.itemOption.findMany.mockResolvedValue([]);
        mockPrisma.itemOption.create.mockRejectedValue(
          new Error("Database write failed"),
        );

        const response = await patchItem({
          ...updateBody,
          isSynced: false,
          options: [{ name: "Bacon", price: 1 }],
        });

        // The error escapes the transaction, so Prisma rolls back the item too.
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to update item" });
      });
    });
  });

  describe("DELETE", () => {
    const itemToDelete = {
      id: "item-123",
      locationId: LOCATION_ID,
      categoryId: "category-123",
      syncGroupId: null,
      imageKey: null,
      originalImageKey: null,
    };

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.item.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteItem({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item does not exist in our records",
      });

      expect(mockPrisma.item.delete).not.toHaveBeenCalled();
    });

    it("returns 500 when deleting the item fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(itemToDelete);
      mockPrisma.item.delete.mockRejectedValue(new Error("Database delete failed"));

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Failed to delete item" });
    });

    it("successfully deletes the item and reorders the remaining items", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(itemToDelete);
      mockPrisma.item.findMany.mockResolvedValue([
        { id: "item-456" },
        { id: "item-789" },
      ]);

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Item deleted successfully",
      });

      expect(mockPrisma.item.delete).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: { locationId: LOCATION_ID, categoryId: "category-123" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.item.update).toHaveBeenNthCalledWith(1, {
        where: { id: "item-456" },
        data: { order: 1 },
      });

      expect(mockPrisma.item.update).toHaveBeenNthCalledWith(2, {
        where: { id: "item-789" },
        data: { order: 2 },
      });
    });

    it("successfully deletes the only item without reordering anything", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(itemToDelete);
      mockPrisma.item.findMany.mockResolvedValue([]);

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(mockPrisma.item.update).not.toHaveBeenCalled();
    });

    it("returns 500 when retrieving the remaining items fails after deletion", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(itemToDelete);
      mockPrisma.item.findMany.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(mockPrisma.item.delete).toHaveBeenCalled();
    });

    it("deletes the item's images from S3 when no other item uses them", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        ...itemToDelete,
        imageKey: PRIVATE_IMAGE,
        originalImageKey: PRIVATE_ORIGINAL,
      });
      mockPrisma.item.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(200);

      expect(mockPrisma.item.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          id: { not: "item-123" },
          OR: [
            { imageKey: { in: [PRIVATE_IMAGE, PRIVATE_ORIGINAL] } },
            { originalImageKey: { in: [PRIVATE_IMAGE, PRIVATE_ORIGINAL] } },
          ],
        },
        select: { imageKey: true, originalImageKey: true },
      });

      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(PRIVATE_ORIGINAL);
    });

    it("keeps a shared image in S3 when synced items still use it", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        ...itemToDelete,
        syncGroupId: "item-sync-group",
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });
      mockPrisma.item.findMany
        .mockResolvedValueOnce([
          { imageKey: SHARED_IMAGE, originalImageKey: SHARED_ORIGINAL },
        ])
        .mockResolvedValueOnce([]);

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(mockedDeleteObject).not.toHaveBeenCalled();
    });

    it("still succeeds when S3 image cleanup fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        ...itemToDelete,
        imageKey: PRIVATE_IMAGE,
      });
      mockPrisma.item.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockedDeleteObject.mockRejectedValue(new Error("S3 delete failed"));

      const response = await deleteItem({ deleteAllSynced: false });

      expect(response.status).toBe(200);
    });

    it("successfully deletes every synchronized item, reorders each category, and removes the shared image", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        ...itemToDelete,
        syncGroupId: "item-sync-group",
        imageKey: SHARED_IMAGE,
        originalImageKey: SHARED_ORIGINAL,
      });
      mockPrisma.item.findMany
        .mockResolvedValueOnce([
          {
            id: "item-123",
            locationId: LOCATION_ID,
            categoryId: "category-123",
            imageKey: SHARED_IMAGE,
            originalImageKey: SHARED_ORIGINAL,
          },
          {
            id: "item-456",
            locationId: "location-456",
            categoryId: "category-456",
            imageKey: SHARED_IMAGE,
            originalImageKey: SHARED_ORIGINAL,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "remaining-a" }])
        .mockResolvedValueOnce([{ id: "remaining-b" }]);

      const response = await deleteItem({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized items deleted successfully",
      });

      expect(mockPrisma.item.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        select: {
          id: true,
          locationId: true,
          categoryId: true,
          imageKey: true,
          originalImageKey: true,
        },
      });

      expect(mockPrisma.item.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["item-123", "item-456"] } },
      });

      expect(mockPrisma.item.findMany).toHaveBeenNthCalledWith(3, {
        where: { locationId: LOCATION_ID, categoryId: "category-123" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.item.findMany).toHaveBeenNthCalledWith(4, {
        where: { locationId: "location-456", categoryId: "category-456" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockedDeleteObject).toHaveBeenCalledTimes(2);
      expect(mockedDeleteObject).toHaveBeenCalledWith(SHARED_IMAGE);
      expect(mockedDeleteObject).toHaveBeenCalledWith(SHARED_ORIGINAL);
      expect(mockPrisma.item.delete).not.toHaveBeenCalled();
    });
  });
});
