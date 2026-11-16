/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { getObjectUrl } from "@/lib/s3/get-url";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { AccessLevel } from "@business-freelancer/database";
import {
  contactsQuery,
  menuCategoriesQuery,
  SCHEDULE_DAYS_QUERY,
  socialsQuery,
} from "@/lib/businessData/selects";

import { GET } from "@/app/api/businesses/[businessId]/export/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const mockedGetObjectUrl = jest.mocked(getObjectUrl);

const request = () =>
  createJsonRequest({
    url: `http://localhost/api/businesses/${BUSINESS_ID}/export`,
    method: "GET",
  });
const context = createRouteContext({ businessId: BUSINESS_ID });

const business = {
  id: BUSINESS_ID,
  name: "Tacos",
  slug: "tacos",
  domain: null,
  imageKey: "businesses/logo.png",
};

const location = {
  id: "location-1",
  days: [{ dayOfWeek: "Sunday" }, { dayOfWeek: "Monday" }],
  categories: [
    {
      id: "category-1",
      subcategories: [],
      items: [
        {
          id: "item-1",
          imageKey: "items/taco.png",
          addOnsVaryByOption: false,
          addOns: [
            {
              addOnId: "cheese",
              price: null,
              order: 0,
              addOn: {
                id: "cheese",
                name: "Cheese",
                description: null,
                calories: null,
                price: "1",
                order: 0,
                isAvailable: true,
                group: { id: "toppings", name: "Toppings", order: 0 },
              },
            },
          ],
          options: [],
        },
      ],
    },
  ],
  addOnGroups: [{ id: "toppings", addOns: [{ id: "cheese" }] }],
  contacts: [{ id: "contact-1" }],
  socials: [{ id: "social-1", icon: "icons/instagram.svg" }],
};

describe("GET /api/businesses/[businessId]/export", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
    mockedGetObjectUrl.mockImplementation(async (key) => `signed:${key}`);
  });

  it("returns the auth error when the user isn't in the business", async () => {
    mockFailedAuthentication(403, "Forbidden");

    const response = await GET(request(), context);

    expect(response.status).toBe(403);
    expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
  });

  it("lets every access level download, developers included", async () => {
    mockFailedAuthentication();
    await GET(request(), context);

    expect(jest.mocked(authenticateBusinessAccess)).toHaveBeenCalledWith(
      expect.any(Request),
      BUSINESS_ID,
      expect.arrayContaining([
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
        AccessLevel.developer,
      ]),
    );
  });

  it("returns 404 when the business is gone", async () => {
    mockSuccessfulAuthentication();
    mockPrisma.business.findUnique.mockResolvedValue(null);
    mockPrisma.location.findMany.mockResolvedValue([]);

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
  });

  it("selects every location with the same data the public API returns", async () => {
    mockSuccessfulAuthentication();
    mockPrisma.business.findUnique.mockResolvedValue(structuredClone(business));
    mockPrisma.location.findMany.mockResolvedValue([]);

    await GET(request(), context);

    const query = mockPrisma.location.findMany.mock.calls[0][0];

    expect(query.where).toEqual({ businessId: BUSINESS_ID });
    expect(query.select).toEqual(
      expect.objectContaining({
        days: SCHEDULE_DAYS_QUERY,
        categories: menuCategoriesQuery(true),
        contacts: contactsQuery(true),
        socials: socialsQuery(true),
        addOnGroups: expect.any(Object),
      }),
    );
  });

  it("downloads the business grouped by location", async () => {
    mockSuccessfulAuthentication();
    mockPrisma.business.findUnique.mockResolvedValue(structuredClone(business));
    mockPrisma.location.findMany.mockResolvedValue([structuredClone(location)]);

    const response = await GET(request(), context);
    const text = await response.text();
    const body = JSON.parse(text);

    expect(response.status).toBe(200);
    // Indented, not one long line.
    expect(text).toBe(`${JSON.stringify(body, null, 2)}\n`);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="tacos-\d{4}-\d{2}-\d{2}\.json"$/,
    );

    expect(body.business.imageKey).toBe("signed:businesses/logo.png");

    const [exported] = body.locations;

    // Monday first, like the schedule endpoint.
    expect(exported.days.map((day: { dayOfWeek: string }) => day.dayOfWeek)).toEqual([
      "Monday",
      "Sunday",
    ]);
    expect(exported.socials[0].icon).toBe("signed:icons/instagram.svg");

    const [item] = exported.categories[0].items;

    expect(item.imageKey).toBe("signed:items/taco.png");
    // Add-on links are resolved like the menu endpoint.
    expect(item.addOns).toBeUndefined();
    expect(item.addOnGroups).toEqual([
      expect.objectContaining({ id: "toppings", addOns: [expect.objectContaining({ id: "cheese", price: "1" })] }),
    ]);
    expect(exported.addOnGroups).toEqual(location.addOnGroups);
    expect(exported.contacts).toEqual(location.contacts);
  });
});
