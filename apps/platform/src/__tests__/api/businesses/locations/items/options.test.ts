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

import { POST } from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/route";
import { PATCH as MOVE_UP } from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/move-up/route";
import { PATCH as MOVE_DOWN } from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/move-down/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/items/item-123/options`;

const itemContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  itemId: "item-123",
});

const optionContext = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  itemId: "item-123",
  optionId: "option-123",
});

const optionBody = {
  name: "Extra Cheese",
  price: 1.5,
  isAvailable: true,
};

const optionLookup = {
  where: {
    id: "option-123",
    itemId: "item-123",
    item: { locationId: LOCATION_ID },
  },
};

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

describe("/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("POST", () => {
    function postOption(body: unknown) {
      return POST(
        createJsonRequest({ url: BASE_URL, method: "POST", body }),
        itemContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.itemOption.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it.each([
      ["name", "Missing option name"],
      ["price", "Missing option price"],
    ])("returns 400 when the option %s is missing", async (field, error) => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postOption({
        ...optionBody,
        [field]: undefined,
        isSynced: false,
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await postOption(optionBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 404 when the item is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item does not exist in our records",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: { id: "item-123", locationId: LOCATION_ID },
        select: { id: true, locationId: true, syncGroupId: true },
      });
    });

    it("returns the getNextOrder error response", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: null,
      });
      mockPrisma.itemOption.findFirst.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to determine the next order",
      });
    });

    it("returns 409 when an option with the same name already exists on the item", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: null,
      });
      mockPrisma.itemOption.findFirst.mockResolvedValue(null);
      mockPrisma.itemOption.create.mockRejectedValue(uniqueConstraintError());

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: "An option with this name already exists on this item",
      });
    });

    it("returns 500 when creating the item option fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: null,
      });
      mockPrisma.itemOption.findFirst.mockResolvedValue(null);
      mockPrisma.itemOption.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to create item option",
      });
    });

    it("successfully creates an item option", async () => {
      const createdOption = {
        id: "option-123",
        itemId: "item-123",
        ...optionBody,
        price: "1.5",
        order: 3,
        syncGroupId: null,
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: null,
      });
      mockPrisma.itemOption.findFirst.mockResolvedValue({ order: 2 });
      mockPrisma.itemOption.create.mockResolvedValue(createdOption);

      const response = await postOption({ ...optionBody, isSynced: false });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(createdOption);

      expect(mockPrisma.itemOption.create).toHaveBeenCalledWith({
        data: {
          itemId: "item-123",
          ...optionBody,
          order: 3,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          itemId: true,
          name: true,
          price: true,
          order: true,
          isAvailable: true,
          syncGroupId: true,
          isSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("returns 400 when synced but the item is not in a sync group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: null,
      });

      const response = await postOption({ ...optionBody, isSynced: true });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This item does not belong to a synchronization group",
      });
    });

    it("successfully creates a synchronized option on every synced item", async () => {
      jest
        .spyOn(crypto, "randomUUID")
        .mockReturnValue("option-sync-group" as ReturnType<Crypto["randomUUID"]>);

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue({
        id: "item-123",
        locationId: LOCATION_ID,
        syncGroupId: "item-sync-group",
      });
      mockPrisma.item.findMany.mockResolvedValue([
        { id: "item-123" },
        { id: "item-456" },
      ]);
      mockPrisma.itemOption.groupBy.mockResolvedValue([
        { itemId: "item-456", _max: { order: 5 } },
      ]);
      mockPrisma.itemOption.createMany.mockResolvedValue({ count: 2 });

      const response = await postOption({ ...optionBody, isSynced: true });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Synchronized item options created successfully",
        count: 2,
        syncGroupId: "option-sync-group",
      });

      expect(mockPrisma.item.findMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "item-sync-group",
          OR: [{ isSynced: true }, { id: "item-123" }],
        },
        select: { id: true },
      });

      expect(mockPrisma.itemOption.createMany).toHaveBeenCalledWith({
        data: [
          {
            itemId: "item-123",
            ...optionBody,
            order: 1,
            syncGroupId: "option-sync-group",
            isSynced: true,
          },
          {
            itemId: "item-456",
            ...optionBody,
            order: 6,
            syncGroupId: "option-sync-group",
            isSynced: true,
          },
        ],
      });
    });
  });

  describe("PATCH /[optionId]", () => {
    const updateBody = { name: "Extra Cheese", price: 1.25, isAvailable: false };

    function patchOption(body: unknown) {
      return PATCH(
        createJsonRequest({
          url: `${BASE_URL}/option-123`,
          method: "PATCH",
          body,
        }),
        optionContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the option name is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchOption({ price: 1, isSynced: false });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing option name" });
    });

    it("returns 400 when the synchronization setting is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await patchOption(updateBody);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Synchronization setting was not found",
      });
    });

    it("returns 404 when the item option is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue(null);

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item option does not exist in our records",
      });

      expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
        ...optionLookup,
        select: { id: true, syncGroupId: true },
      });
    });

    it("returns 409 when another option on the item already uses the name", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        syncGroupId: null,
      });
      mockPrisma.itemOption.update.mockRejectedValue(uniqueConstraintError());

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(409);
    });

    it("returns 500 when updating the item option fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        syncGroupId: null,
      });
      mockPrisma.itemOption.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update item option",
      });
    });

    it("successfully updates only the selected item option", async () => {
      const updatedOption = {
        id: "option-123",
        itemId: "item-123",
        ...updateBody,
        isSynced: false,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        syncGroupId: "option-sync-group",
      });
      mockPrisma.itemOption.update.mockResolvedValue(updatedOption);

      const response = await patchOption({ ...updateBody, isSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedOption);

      expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
        where: { id: "option-123" },
        data: { ...updateBody, isSynced: false },
        select: {
          id: true,
          itemId: true,
          name: true,
          price: true,
          order: true,
          isAvailable: true,
          syncGroupId: true,
          isSynced: true,
          updatedAt: true,
        },
      });

      expect(mockPrisma.itemOption.updateMany).not.toHaveBeenCalled();
    });

    it("successfully updates every synchronized item option in the group", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        syncGroupId: "option-sync-group",
      });
      mockPrisma.itemOption.updateMany.mockResolvedValue({ count: 2 });

      const response = await patchOption({ ...updateBody, isSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized item options updated successfully",
      });

      expect(mockPrisma.itemOption.updateMany).toHaveBeenCalledWith({
        where: {
          syncGroupId: "option-sync-group",
          OR: [{ isSynced: true }, { id: "option-123" }],
        },
        data: { ...updateBody, isSynced: true },
      });

      expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /[optionId]", () => {
    function deleteOption(body: unknown) {
      return DELETE(
        createJsonRequest({
          url: `${BASE_URL}/option-123`,
          method: "DELETE",
          body,
        }),
        optionContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(401);
      expect(mockPrisma.itemOption.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 400 when the delete synchronization option is missing", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();

      const response = await deleteOption({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Delete synchronization option was not found",
      });
    });

    it("returns 404 when the item option is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue(null);

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item option does not exist in our records",
      });
    });

    it("returns 500 when deleting the item option fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        itemId: "item-123",
        syncGroupId: null,
      });
      mockPrisma.itemOption.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete item option",
      });
    });

    it("successfully deletes the item option and reorders the remaining options", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        itemId: "item-123",
        syncGroupId: null,
      });
      mockPrisma.itemOption.findMany.mockResolvedValue([
        { id: "option-456" },
        { id: "option-789" },
      ]);

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Item option deleted successfully",
      });

      expect(mockPrisma.itemOption.delete).toHaveBeenCalledWith({
        where: { id: "option-123" },
      });

      expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(1, {
        where: { id: "option-456" },
        data: { order: 1 },
      });

      expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(2, {
        where: { id: "option-789" },
        data: { order: 2 },
      });
    });

    it("successfully deletes the only item option without reordering anything", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        itemId: "item-123",
        syncGroupId: null,
      });
      mockPrisma.itemOption.findMany.mockResolvedValue([]);

      const response = await deleteOption({ deleteAllSynced: false });

      expect(response.status).toBe(200);
      expect(mockPrisma.itemOption.update).not.toHaveBeenCalled();
    });

    it("successfully deletes every synchronized option and reorders each item", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue({
        id: "option-123",
        itemId: "item-123",
        syncGroupId: "option-sync-group",
      });
      mockPrisma.itemOption.findMany
        .mockResolvedValueOnce([
          { id: "option-123", itemId: "item-123" },
          { id: "option-456", itemId: "item-456" },
        ])
        .mockResolvedValueOnce([{ id: "remaining-a" }])
        .mockResolvedValueOnce([]);

      const response = await deleteOption({ deleteAllSynced: true });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Synchronized item options deleted successfully",
      });

      expect(mockPrisma.itemOption.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["option-123", "option-456"] } },
      });

      expect(mockPrisma.itemOption.findMany).toHaveBeenNthCalledWith(2, {
        where: { itemId: "item-123" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.itemOption.findMany).toHaveBeenNthCalledWith(3, {
        where: { itemId: "item-456" },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      expect(mockPrisma.itemOption.update).toHaveBeenCalledWith({
        where: { id: "remaining-a" },
        data: { order: 1 },
      });

      expect(mockPrisma.itemOption.delete).not.toHaveBeenCalled();
    });
  });

  describe.each([
    {
      name: "move-up",
      handler: MOVE_UP,
      neighbor: { id: "option-above", order: 1 },
      orderFilter: { lt: 2 },
      orderBy: "desc",
      edgeError: "Item option is already at the top",
    },
    {
      name: "move-down",
      handler: MOVE_DOWN,
      neighbor: { id: "option-below", order: 3 },
      orderFilter: { gt: 2 },
      orderBy: "asc",
      edgeError: "Item option is already at the bottom",
    },
  ] as const)("PATCH /[optionId]/$name", (direction) => {
    function move() {
      return direction.handler(
        createJsonRequest({
          url: `${BASE_URL}/option-123/${direction.name}`,
          method: "PATCH",
        }),
        optionContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await move();

      expect(response.status).toBe(401);
      expect(mockPrisma.itemOption.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 404 when the item option is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst.mockResolvedValue(null);

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item option does not exist in our records",
      });

      expect(mockPrisma.itemOption.findFirst).toHaveBeenCalledWith({
        ...optionLookup,
        select: { id: true, order: true },
      });
    });

    it("returns 400 when the item option is already at the edge", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst
        .mockResolvedValueOnce({ id: "option-123", order: 2 })
        .mockResolvedValueOnce(null);

      const response = await move();

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: direction.edgeError });
    });

    it("successfully swaps the item option with its neighbor", async () => {
      const updatedOption = {
        id: "option-123",
        itemId: "item-123",
        order: direction.neighbor.order,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.itemOption.findFirst
        .mockResolvedValueOnce({ id: "option-123", order: 2 })
        .mockResolvedValueOnce(direction.neighbor);
      mockPrisma.itemOption.update
        .mockResolvedValueOnce(updatedOption)
        .mockResolvedValueOnce({});

      const response = await move();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedOption);

      expect(mockPrisma.itemOption.findFirst).toHaveBeenNthCalledWith(2, {
        where: { itemId: "item-123", order: direction.orderFilter },
        orderBy: { order: direction.orderBy },
        select: { id: true, order: true },
      });

      expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(1, {
        where: { id: "option-123" },
        data: { order: direction.neighbor.order },
        select: { id: true, itemId: true, order: true, updatedAt: true },
      });

      expect(mockPrisma.itemOption.update).toHaveBeenNthCalledWith(2, {
        where: { id: direction.neighbor.id },
        data: { order: 2 },
      });
    });
  });
});
