/**
 * @jest-environment node
 */

/*
 * Guards the developer API reference against drift. For every documented
 * endpoint this checks that:
 *
 *   1. the documented fields match what the route actually selects for an
 *      API-key request, and
 *   2. the example response has exactly the documented fields.
 *
 * If a route gains or loses a field, update src/data/apiReference.ts.
 */

import {
  createPublicRequest,
  mockApiKeyReadAccess,
} from "@/__tests__/helpers/publicAuth";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import {
  PUBLIC_API_ENDPOINTS,
  type ApiField,
} from "@/data/apiReference";

import { GET as GET_BUSINESS } from "@/app/api/business/route";
import { GET as GET_LOCATIONS } from "@/app/api/business/locations/route";
import { GET as GET_SCHEDULE } from "@/app/api/business/locations/schedule/route";
import { GET as GET_CONTACTS } from "@/app/api/business/contacts/route";
import { GET as GET_SOCIALS } from "@/app/api/business/socials/route";
import { GET as GET_CATEGORIES } from "@/app/api/business/categories/route";
import { GET as GET_CATEGORY } from "@/app/api/business/categories/[categoryId]/route";
import { GET as GET_MENU } from "@/app/api/business/menu/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// A plain function (not jest.fn) so jest.resetAllMocks() does not clear it.
// Keeps rateLimiterRead's plan lookup off the business.findUnique mock, so
// the select captured below is the route's own.
jest.mock("@/lib/billing/getBusinessPlan", () => ({
  getBusinessPlan: async () => ({
    planKey: "free",
    limits: jest.requireActual("@/lib/billing/plans").PLANS.free,
    locationSlots: 1,
  }),
}));

jest.mock("@/lib/auth/authenticateBusinessReadAccess", () => ({
  authenticateBusinessReadAccess: jest.fn(),
}));

// A field name mapped to its nested shape, or null for a leaf value
type Shape = { [field: string]: Shape | null };

type SelectArgs = { select?: Record<string, unknown> };

function selectToShape(select: Record<string, unknown>): Shape {
  const shape: Shape = {};

  for (const [field, value] of Object.entries(select)) {
    if (value === true) {
      shape[field] = null;
    } else if (value && typeof value === "object" && "select" in value) {
      shape[field] = selectToShape((value as SelectArgs).select ?? {});
    }
  }

  return shape;
}

function fieldsToShape(fields: ApiField[]): Shape {
  const shape: Shape = {};

  for (const field of fields) {
    shape[field.name] = field.fields ? fieldsToShape(field.fields) : null;
  }

  return shape;
}

function mergeShapes(shapes: (Shape | null)[]): Shape | null {
  const objects = shapes.filter((shape): shape is Shape => shape !== null);

  if (objects.length === 0) return null;

  const merged: Shape = {};

  for (const shape of objects) {
    for (const [field, value] of Object.entries(shape)) {
      merged[field] = mergeShapes([merged[field] ?? null, value]);
    }
  }

  return merged;
}

/*
 * Arrays of objects merge their elements' shapes (so a null in one element and
 * an object in another resolve to the object). Arrays of primitives are leaves.
 */
function exampleToShape(value: unknown): Shape | null {
  if (Array.isArray(value)) {
    return mergeShapes(value.map(exampleToShape));
  }

  if (value === null || typeof value !== "object") {
    return null;
  }

  const shape: Shape = {};

  for (const [field, fieldValue] of Object.entries(value)) {
    shape[field] = exampleToShape(fieldValue);
  }

  return shape;
}

/*
 * Every object in the example must have every documented field, so a missing
 * field can't hide behind another element in the same array.
 */
function expectCompleteExample(value: unknown, shape: Shape | null, path: string) {
  if (shape === null || value === null) return;

  if (Array.isArray(value)) {
    value.forEach((element, index) =>
      expectCompleteExample(element, shape, `${path}[${index}]`),
    );
    return;
  }

  expect({ path, keys: Object.keys(value as object).sort() }).toEqual({
    path,
    keys: Object.keys(shape).sort(),
  });

  for (const [field, nested] of Object.entries(shape)) {
    expectCompleteExample(
      (value as Record<string, unknown>)[field],
      nested,
      `${path}.${field}`,
    );
  }
}

function lastSelect(mock: jest.Mock): Record<string, unknown> {
  const calls = mock.mock.calls;
  return (calls[calls.length - 1][0] as SelectArgs).select ?? {};
}

const routeSelects: Record<string, () => Promise<Record<string, unknown>>> = {
  business: async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "business" });
    await GET_BUSINESS(createPublicRequest("/api/business"));
    return lastSelect(mockPrisma.business.findUnique);
  },
  locations: async () => {
    mockPrisma.location.findMany.mockResolvedValue([]);
    await GET_LOCATIONS(createPublicRequest("/api/business/locations"));
    return lastSelect(mockPrisma.location.findMany);
  },
  schedule: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ days: [] });
    await GET_SCHEDULE(createPublicRequest("/api/business/locations/schedule"));
    return lastSelect(mockPrisma.location.findFirst);
  },
  contacts: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ contacts: [] });
    await GET_CONTACTS(createPublicRequest("/api/business/contacts"));
    return lastSelect(mockPrisma.location.findFirst);
  },
  socials: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ socials: [] });
    await GET_SOCIALS(createPublicRequest("/api/business/socials"));
    return lastSelect(mockPrisma.location.findFirst);
  },
  categories: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ categories: [] });
    await GET_CATEGORIES(createPublicRequest("/api/business/categories"));
    return lastSelect(mockPrisma.location.findFirst);
  },
  category: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ categories: [] });
    await GET_CATEGORY(
      createPublicRequest("/api/business/categories/category-123"),
      createRouteContext({ categoryId: "category-123" }),
    );
    return lastSelect(mockPrisma.location.findFirst);
  },
  menu: async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ categories: [] });
    await GET_MENU(createPublicRequest("/api/business/menu"));
    return lastSelect(mockPrisma.location.findFirst);
  },
};

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
  mockApiKeyReadAccess();
});

it("documents every public endpoint that has a route check", () => {
  expect(PUBLIC_API_ENDPOINTS.map((endpoint) => endpoint.id).sort()).toEqual(
    Object.keys(routeSelects).sort(),
  );
});

describe.each(PUBLIC_API_ENDPOINTS.map((endpoint) => [endpoint.path, endpoint]))(
  "%s",
  (_path, endpoint) => {
    const documented = fieldsToShape(endpoint.fields);

    it("documents exactly the fields the route returns to API-key requests", async () => {
      const select = await routeSelects[endpoint.id]();

      expect(documented).toEqual(selectToShape(select));
    });

    it("has an example with exactly the documented fields", () => {
      expect(exampleToShape(endpoint.example)).toEqual(documented);
      expectCompleteExample(endpoint.example, documented, endpoint.id);
    });

    it("has an example of the documented response type", () => {
      expect(Array.isArray(endpoint.example)).toBe(
        endpoint.responseType === "array",
      );
    });
  },
);
