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

import { PATCH as MOVE_UP } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/[itemId]/move-up/route";
import { PATCH as MOVE_DOWN } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/[itemId]/move-down/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/categories/category-123/items/item-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  categoryId: "category-123",
  itemId: "item-123",
});

const currentItem = { id: "item-123", order: 2 };

const directions = [
  {
    name: "move-up",
    handler: MOVE_UP,
    neighbor: { id: "item-above", order: 1 },
    orderFilter: { lt: 2 },
    orderBy: "desc",
    edgeError: "Item is already at the top",
  },
  {
    name: "move-down",
    handler: MOVE_DOWN,
    neighbor: { id: "item-below", order: 3 },
    orderFilter: { gt: 2 },
    orderBy: "asc",
    edgeError: "Item is already at the bottom",
  },
] as const;

describe("item ordering routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe.each(directions)("PATCH $name", (direction) => {
    function move() {
      return direction.handler(
        createJsonRequest({
          url: `${BASE_URL}/${direction.name}`,
          method: "PATCH",
        }),
        context,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await move();

      expect(response.status).toBe(401);
      expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 404 when the item is not found in the selected category", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst.mockResolvedValue(null);

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This item does not exist in our records",
      });

      expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
        where: {
          id: "item-123",
          categoryId: "category-123",
          locationId: LOCATION_ID,
        },
        select: { id: true, order: true },
      });
    });

    it("returns 400 when the item is already at the edge", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(currentItem)
        .mockResolvedValueOnce(null);

      const response = await move();

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: direction.edgeError });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns 500 when swapping the items fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(currentItem)
        .mockResolvedValueOnce(direction.neighbor);
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Database transaction failed"),
      );

      const response = await move();

      expect(response.status).toBe(500);
    });

    it("successfully swaps the item with its neighbor", async () => {
      const updatedItem = {
        id: "item-123",
        locationId: LOCATION_ID,
        categoryId: "category-123",
        order: direction.neighbor.order,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.item.findFirst
        .mockResolvedValueOnce(currentItem)
        .mockResolvedValueOnce(direction.neighbor);
      mockPrisma.item.update
        .mockResolvedValueOnce(updatedItem)
        .mockResolvedValueOnce({});

      const response = await move();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedItem);

      expect(mockPrisma.item.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          categoryId: "category-123",
          locationId: LOCATION_ID,
          order: direction.orderFilter,
        },
        orderBy: { order: direction.orderBy },
        select: { id: true, order: true },
      });

      expect(mockPrisma.item.update).toHaveBeenNthCalledWith(1, {
        where: { id: "item-123" },
        data: { order: direction.neighbor.order },
        select: {
          id: true,
          locationId: true,
          categoryId: true,
          order: true,
          updatedAt: true,
        },
      });

      expect(mockPrisma.item.update).toHaveBeenNthCalledWith(2, {
        where: { id: direction.neighbor.id },
        data: { order: 2 },
      });
    });
  });
});
