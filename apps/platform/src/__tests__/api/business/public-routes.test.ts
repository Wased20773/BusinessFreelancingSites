/**
 * @jest-environment node
 */

import { BUSINESS_ID, LOCATION_ID } from "@/__tests__/helpers/ids";
import {
  createPublicRequest,
  mockApiKeyReadAccess,
  mockFailedReadAccess,
  mockRateLimitedApiKey,
  mockSessionReadAccess,
} from "@/__tests__/helpers/publicAuth";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { getObjectUrl } from "@/lib/s3/get-url";

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

jest.mock("@/lib/auth/authenticateBusinessReadAccess", () => ({
  authenticateBusinessReadAccess: jest.fn(),
}));

const mockedAuthenticateBusinessReadAccess = jest.mocked(
  authenticateBusinessReadAccess,
);
const mockedGetObjectUrl = jest.mocked(getObjectUrl);

const SYNC_FIELDS = { syncGroupId: true, isSynced: true };

type SelectObject = Record<string, unknown>;

function lastLocationQuery(): { select: Record<string, { select: SelectObject }> } {
  const calls = mockPrisma.location.findFirst.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

/*
 * Every location-scoped route built on getLocationResponse() shares the
 * same contract: auth passthrough, API-key rate limiting, location scoping,
 * error handling, and sync fields only for dashboard sessions.
 */
describe.each([
  {
    route: "GET /api/business/contacts",
    get: () => GET_CONTACTS(createPublicRequest("/api/business/contacts")),
    resource: "contact",
    routeError: "Failed to fetch business contacts",
    emptyData: { contacts: [] },
    selects: (query: ReturnType<typeof lastLocationQuery>) => [
      query.select.contacts.select,
    ],
  },
  {
    route: "GET /api/business/socials",
    get: () => GET_SOCIALS(createPublicRequest("/api/business/socials")),
    resource: "social",
    routeError: "Failed to fetch business socials",
    emptyData: { socials: [] },
    selects: (query: ReturnType<typeof lastLocationQuery>) => [
      query.select.socials.select,
    ],
  },
  {
    route: "GET /api/business/categories",
    get: () => GET_CATEGORIES(createPublicRequest("/api/business/categories")),
    resource: "category",
    routeError: "Failed to fetch business menu categories",
    emptyData: { categories: [] },
    selects: (query: ReturnType<typeof lastLocationQuery>) => [
      query.select.categories.select,
      (query.select.categories.select.subcategories as { select: SelectObject })
        .select,
    ],
  },
  {
    route: "GET /api/business/categories/[categoryId]",
    get: () =>
      GET_CATEGORY(
        createPublicRequest("/api/business/categories/category-123"),
        createRouteContext({ categoryId: "category-123" }),
      ),
    resource: "category",
    routeError: "Failed to fetch category",
    emptyData: { categories: [] },
    selects: (query: ReturnType<typeof lastLocationQuery>) => [
      query.select.categories.select,
      (query.select.categories.select.subcategories as { select: SelectObject })
        .select,
    ],
  },
  {
    route: "GET /api/business/menu",
    get: () => GET_MENU(createPublicRequest("/api/business/menu")),
    resource: "menu",
    routeError: "Failed to fetch business menu",
    emptyData: { categories: [] },
    selects: (query: ReturnType<typeof lastLocationQuery>) => [
      query.select.categories.select,
      (query.select.categories.select.subcategories as { select: SelectObject })
        .select,
    ],
  },
])("$route", ({ get, resource, routeError, emptyData, selects }) => {
  it("returns the authentication error response", async () => {
    mockFailedReadAccess();

    const response = await get();

    expect(response.status).toBe(401);
    expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
  });

  it("returns 429 when an API key is rate limited", async () => {
    mockRateLimitedApiKey();

    const response = await get();

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Too many requests.",
      retryAfterMs: 1000,
    });

    expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the location is not in the authenticated business", async () => {
    mockSessionReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: `Location not found while fetching ${resource} data`,
    });

    expect(lastLocationQuery()).toEqual(
      expect.objectContaining({
        where: { id: LOCATION_ID, businessId: BUSINESS_ID },
      }),
    );
  });

  it("returns 500 when fetching the location data fails", async () => {
    mockSessionReadAccess();
    mockPrisma.location.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const response = await get();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: `Failed to fetch ${resource} data`,
    });
  });

  it("returns a generic 500 without leaking the internal error", async () => {
    mockedAuthenticateBusinessReadAccess.mockRejectedValue(
      new Error("secret connection string"),
    );

    const response = await get();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: routeError });
  });

  it("includes sync fields for dashboard session requests", async () => {
    mockSessionReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue(emptyData);

    const response = await get();

    expect(response.status).toBe(200);

    for (const select of selects(lastLocationQuery())) {
      expect(select).toEqual(expect.objectContaining(SYNC_FIELDS));
    }
  });

  it("never exposes sync fields to client websites using an API key", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue(emptyData);

    const response = await get();

    expect(response.status).toBe(200);

    for (const select of selects(lastLocationQuery())) {
      expect(select).not.toHaveProperty("syncGroupId");
      expect(select).not.toHaveProperty("isSynced");
    }
  });
});

describe("GET /api/business/socials icon URLs", () => {
  it("returns each social icon as a viewable URL", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue({
      socials: [
        { id: "social-1", icon: "icons/instagram.webp" },
        { id: "social-2", icon: "icons/tiktok.webp" },
      ],
    });
    mockedGetObjectUrl.mockImplementation(async (key) => `https://cdn/${key}`);

    const response = await GET_SOCIALS(createPublicRequest("/api/business/socials"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      socials: [
        { id: "social-1", icon: "https://cdn/icons/instagram.webp" },
        { id: "social-2", icon: "https://cdn/icons/tiktok.webp" },
      ],
    });
  });

  it("returns a JSON 500 when signing an icon URL fails", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue({
      socials: [{ id: "social-1", icon: "icons/instagram.webp" }],
    });
    mockedGetObjectUrl.mockRejectedValue(new Error("S3 unavailable"));

    const response = await GET_SOCIALS(createPublicRequest("/api/business/socials"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch business socials",
    });
  });
});

describe("GET /api/business/categories/[categoryId]", () => {
  it("returns 400 when the categoryId is missing", async () => {
    const response = await GET_CATEGORY(
      createPublicRequest("/api/business/categories/"),
      createRouteContext({ categoryId: "" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing category id" });
  });

  it("only selects the requested category", async () => {
    mockSessionReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue({ categories: [] });

    await GET_CATEGORY(
      createPublicRequest("/api/business/categories/category-123"),
      createRouteContext({ categoryId: "category-123" }),
    );

    expect(lastLocationQuery().select.categories).toEqual(
      expect.objectContaining({ where: { id: "category-123" } }),
    );
  });
});

describe("GET /api/business", () => {
  const business = {
    id: BUSINESS_ID,
    name: "Tacos El Guero",
    slug: "tacos-el-guero",
    domain: null,
  };

  function getBusiness() {
    return GET_BUSINESS(createPublicRequest("/api/business"));
  }

  it("does not require a location", async () => {
    mockFailedReadAccess();

    await getBusiness();

    expect(mockedAuthenticateBusinessReadAccess).toHaveBeenCalledWith(
      expect.any(Request),
      expect.any(Array),
      { requireLocation: false },
    );
  });

  it("returns the authentication error response", async () => {
    mockFailedReadAccess();

    const response = await getBusiness();

    expect(response.status).toBe(401);
    expect(mockPrisma.business.findUnique).not.toHaveBeenCalled();
  });

  it("returns 429 when an API key is rate limited", async () => {
    mockRateLimitedApiKey();

    const response = await getBusiness();

    expect(response.status).toBe(429);
  });

  it("returns 404 when the business is not found", async () => {
    mockApiKeyReadAccess();
    mockPrisma.business.findUnique.mockResolvedValue(null);

    const response = await getBusiness();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Business not found" });
  });

  it("returns 500 when fetching the business fails", async () => {
    mockApiKeyReadAccess();
    mockPrisma.business.findUnique.mockRejectedValue(
      new Error("Database query failed"),
    );

    const response = await getBusiness();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch business" });
  });

  it("returns the authenticated business", async () => {
    mockApiKeyReadAccess();
    mockPrisma.business.findUnique.mockResolvedValue(business);

    const response = await getBusiness();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(business);

    expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
      where: { id: BUSINESS_ID },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
});

describe("GET /api/business/locations", () => {
  function getLocations() {
    return GET_LOCATIONS(createPublicRequest("/api/business/locations"));
  }

  it("returns the authentication error response", async () => {
    mockFailedReadAccess();

    const response = await getLocations();

    expect(response.status).toBe(401);
    expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
  });

  it("returns 429 when an API key is rate limited", async () => {
    mockRateLimitedApiKey();

    const response = await getLocations();

    expect(response.status).toBe(429);
  });

  it("returns a generic 500 without leaking the internal error", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findMany.mockRejectedValue(
      new Error("secret connection string"),
    );

    const response = await getLocations();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch business locations",
    });
  });

  it("returns the business's locations, active first", async () => {
    const locations = [{ id: LOCATION_ID, address: "123 Example St" }];

    mockApiKeyReadAccess();
    mockPrisma.location.findMany.mockResolvedValue(locations);

    const response = await getLocations();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(locations);

    expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: BUSINESS_ID },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      }),
    );
  });
});

describe("GET /api/business/locations/schedule", () => {
  function getSchedule() {
    return GET_SCHEDULE(createPublicRequest("/api/business/locations/schedule"));
  }

  it("returns the authentication error response", async () => {
    mockFailedReadAccess();

    const response = await getSchedule();

    expect(response.status).toBe(401);
  });

  it("returns 404 when the location is not in the authenticated business", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue(null);

    const response = await getSchedule();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "Location not found while fetching schedule data",
    });

    expect(lastLocationQuery()).toEqual(
      expect.objectContaining({
        where: { id: LOCATION_ID, businessId: BUSINESS_ID },
      }),
    );
  });

  it("returns 500 when fetching the schedule fails", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const response = await getSchedule();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to fetch location schedule",
    });
  });

  it("returns the schedule with days sorted Monday to Sunday", async () => {
    mockApiKeyReadAccess();
    mockPrisma.location.findFirst.mockResolvedValue({
      id: LOCATION_ID,
      days: [
        { id: "day-fri", dayOfWeek: "Friday" },
        { id: "day-mon", dayOfWeek: "Monday" },
        { id: "day-sat", dayOfWeek: "Saturday" },
      ],
    });

    const response = await getSchedule();

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.days.map((day: { dayOfWeek: string }) => day.dayOfWeek)).toEqual([
      "Monday",
      "Friday",
      "Saturday",
    ]);
  });
});
