/**
 * @jest-environment node
 */

import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

import { mockPrisma } from "@/__tests__/mocks/prisma";
import { GET } from "@/app/api/business/menu/items/[itemId]/route";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessReadAccess", () => ({
  authenticateBusinessReadAccess: jest.fn(),
}));

const mockedAuthenticateBusinessReadAccess = jest.mocked(
  authenticateBusinessReadAccess,
);

const allowedRoles = [
  AccessLevel.developer,
  AccessLevel.owner,
  AccessLevel.admin,
  AccessLevel.staff,
];

function createItemParams(itemSlug: string) {
  return Promise.resolve({
    itemSlug,
  });
}

describe("GET /api/business/menu/items/[itemSlug]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authentication response when authentication fails", async () => {
    const deniedResponse = NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );

    mockedAuthenticateBusinessReadAccess.mockResolvedValue(
      deniedResponse as never,
    );

    const request = new Request(
      "http://localhost/api/business/menu/items/taco",
    );

    const response = await GET(request, createItemParams("taco"));

    const responseBody = await response.json();

    expect(response.status).toBe(401);

    expect(responseBody).toEqual({
      error: "Unauthorized",
    });

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 when the item slug is missing", async () => {
    mockedAuthenticateBusinessReadAccess.mockResolvedValue({
      businessId: "business-123",
      authenticationType: "session",
      userId: "user-123",
    } as never);

    const request = new Request("http://localhost/api/business/menu/items");

    const response = await GET(request, createItemParams(""));

    const responseBody = await response.json();

    expect(response.status).toBe(400);

    expect(responseBody).toEqual({
      error: "Missing item slug",
    });

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockPrisma.item.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the item is not found for the authenticated business", async () => {
    mockedAuthenticateBusinessReadAccess.mockResolvedValue({
      businessId: "business-123",
      authenticationType: "apiKey",
    } as never);

    mockPrisma.item.findFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/business/menu/items/birria-taco",
      {
        headers: {
          Authorization: "Bearer bp_valid-key",
        },
      },
    );

    const response = await GET(request, createItemParams("birria-taco"));

    const responseBody = await response.json();

    expect(response.status).toBe(404);

    expect(responseBody).toEqual({
      error: "Item not found for this business",
    });

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
      where: {
        slug: "birria-taco",
        businessId: "business-123",
      },
      select: {
        id: true,
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
        createdAt: true,
        updatedAt: true,
        options: {
          select: {
            id: true,
            itemId: true,
            name: true,
            price: true,
            order: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  it("returns 500 when fetching the business item fails", async () => {
    mockedAuthenticateBusinessReadAccess.mockResolvedValue({
      businessId: "business-123",
      authenticationType: "session",
      userId: "user-123",
    } as never);

    mockPrisma.item.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const request = new Request(
      "http://localhost/api/business/menu/items/birria-taco",
    );

    const response = await GET(request, createItemParams("birria-taco"));

    const responseBody = await response.json();

    expect(response.status).toBe(500);

    expect(responseBody).toEqual({
      error: "Failed to fetch business item",
    });

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockPrisma.item.findFirst).toHaveBeenCalled();
  });

  it("successfully returns the selected business item and its options", async () => {
    const createdAt = new Date("2026-07-17T12:00:00.000Z");

    const updatedAt = new Date("2026-07-18T12:00:00.000Z");

    const item = {
      id: "item-123",
      categoryId: "category-123",
      name: "Birria Taco",
      description: "Slow-cooked beef taco",
      containsList: ["beef", "onion", "cilantro"],
      calories: 420,
      price: 4.5,
      order: 1,
      isAvailable: true,
      slug: "birria-taco",
      imageKey: "items/item-123.webp",
      createdAt,
      updatedAt,
      options: [
        {
          id: "option-123",
          itemId: "item-123",
          name: "Extra Cheese",
          price: 1.5,
          order: 1,
          isAvailable: true,
          createdAt,
          updatedAt,
        },
      ],
    };

    mockedAuthenticateBusinessReadAccess.mockResolvedValue({
      businessId: "business-123",
      authenticationType: "apiKey",
    } as never);

    mockPrisma.item.findFirst.mockResolvedValue(item as never);

    const request = new Request(
      "http://localhost/api/business/menu/items/birria-taco",
      {
        headers: {
          Authorization: "Bearer bp_valid-key",
        },
      },
    );

    const response = await GET(request, createItemParams("birria-taco"));

    const responseBody = await response.json();

    expect(response.status).toBe(200);

    expect(responseBody).toEqual({
      ...item,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      options: [
        {
          ...item.options[0],
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ],
    });

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      request,
      allowedRoles,
    );

    expect(mockPrisma.item.findFirst).toHaveBeenCalledWith({
      where: {
        slug: "birria-taco",
        businessId: "business-123",
      },
      select: {
        id: true,
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
        createdAt: true,
        updatedAt: true,
        options: {
          select: {
            id: true,
            itemId: true,
            name: true,
            price: true,
            order: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });
});
