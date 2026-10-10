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

import { PATCH as MOVE_UP } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-up/route";
import { PATCH as MOVE_DOWN } from "@/app/api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-down/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/categories/category-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  categoryId: "category-123",
});

const currentCategory = {
  id: "category-123",
  order: 2,
  parentId: null,
};

const directions = [
  {
    name: "move-up",
    handler: MOVE_UP,
    neighbor: { id: "category-above", order: 1 },
    orderFilter: { lt: 2 },
    orderBy: "desc",
    edgeError: "Category is already at the top",
    updateSelect: {
      id: true,
      locationId: true,
      parentId: true,
      name: true,
      description: true,
      order: true,
      isVisible: true,
      syncGroupId: true,
      isSynced: true,
      updatedAt: true,
    },
  },
  {
    name: "move-down",
    handler: MOVE_DOWN,
    neighbor: { id: "category-below", order: 3 },
    orderFilter: { gt: 2 },
    orderBy: "asc",
    edgeError: "Category is already at the bottom",
    updateSelect: {
      id: true,
      name: true,
      description: true,
      order: true,
      isVisible: true,
      syncGroupId: true,
      isSynced: true,
      updatedAt: true,
    },
  },
] as const;

describe("category ordering routes", () => {
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
      expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when the location does not belong to the business", async () => {
      mockSuccessfulAuthentication();
      mockLocationNotInBusiness();

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual(LOCATION_NOT_FOUND);
    });

    it("returns 404 when the category is not found", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst.mockResolvedValue(null);

      const response = await move();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This category does not exist in our records",
      });

      expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: "category-123", locationId: LOCATION_ID },
        select: { id: true, order: true, parentId: true },
      });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it(`returns 400 when the category is already at the edge`, async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(currentCategory)
        .mockResolvedValueOnce(null);

      const response = await move();

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: direction.edgeError });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns 500 when swapping the categories fails", async () => {
      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(currentCategory)
        .mockResolvedValueOnce(direction.neighbor);
      mockPrisma.$transaction.mockRejectedValue(
        new Error("Database transaction failed"),
      );

      const response = await move();

      expect(response.status).toBe(500);
    });

    it("successfully swaps the category with its neighbor among the same siblings", async () => {
      const updatedCategory = {
        id: "category-123",
        order: direction.neighbor.order,
      };

      mockSuccessfulAuthentication();
      mockLocationInBusiness();
      mockPrisma.category.findFirst
        .mockResolvedValueOnce(currentCategory)
        .mockResolvedValueOnce(direction.neighbor);
      mockPrisma.category.update
        .mockResolvedValueOnce(updatedCategory)
        .mockResolvedValueOnce({});

      const response = await move();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updatedCategory);

      expect(mockPrisma.category.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          locationId: LOCATION_ID,
          parentId: null,
          order: direction.orderFilter,
        },
        orderBy: { order: direction.orderBy },
        select: { id: true, order: true },
      });

      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(1, {
        where: { id: "category-123" },
        data: { order: direction.neighbor.order },
        select: direction.updateSelect,
      });

      expect(mockPrisma.category.update).toHaveBeenNthCalledWith(2, {
        where: { id: direction.neighbor.id },
        data: { order: 2 },
      });
    });
  });
});
