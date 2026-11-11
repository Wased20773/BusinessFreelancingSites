/*
 *   Public API reference: the structure of every client-website endpoint
 *   (/api/business/*) as returned to API-key requests, plus SAMPLE responses.
 *
 *   The examples are made-up data, never a real business's records.
 *
 *   Keep this file in sync with the route handlers. The test in
 *   src/__tests__/data/apiReference.test.ts fails when a route's selected
 *   fields, the documented fields, and the example response disagree.
 **/

export type ApiField = {
  name: string;
  type: string;
  description?: string;
  // Nested fields for objects and arrays of objects
  fields?: ApiField[];
};

export type ApiEndpoint = {
  id: string;
  title: string;
  method: "GET";
  path: string;
  description: string;
  requiresLocation: boolean;
  pathParams?: { name: string; description: string }[];
  responseType: "object" | "array";
  fields: ApiField[];
  example: unknown;
};

// --------------------
// Shared field definitions

const UUID = "string (UUID)";
const DATE = "string (ISO 8601 date)";

const idField: ApiField = { name: "id", type: UUID };
const locationIdField: ApiField = {
  name: "locationId",
  type: UUID,
  description: "The location this record belongs to.",
};

const timestampFields: ApiField[] = [
  { name: "createdAt", type: DATE },
  { name: "updatedAt", type: DATE },
];

const priceField: ApiField = {
  name: "price",
  type: "string (decimal)",
  description:
    'Sent as a string to keep exact cents, and trailing zeros may be dropped ("3.5" means 3.50). Format with Number(price).toFixed(2).',
};

const optionFields: ApiField[] = [
  idField,
  { name: "itemId", type: UUID },
  { name: "name", type: "string" },
  priceField,
  { name: "order", type: "number", description: "Display order, ascending." },
  { name: "isAvailable", type: "boolean" },
  ...timestampFields,
];

const itemFields: ApiField[] = [
  idField,
  locationIdField,
  { name: "categoryId", type: UUID },
  { name: "name", type: "string" },
  { name: "description", type: "string | null" },
  {
    name: "containsList",
    type: "string[]",
    description: "Ingredients or allergens the item contains.",
  },
  { name: "calories", type: "number | null" },
  priceField,
  { name: "order", type: "number", description: "Display order, ascending." },
  { name: "isAvailable", type: "boolean" },
  {
    name: "slug",
    type: "string",
    description: "URL-friendly name, unique per location.",
  },
  {
    name: "imageKey",
    type: "string | null",
    description:
      "A signed image URL (not a key) that expires 1 hour after the response. Use it directly in <img src>. Re-fetch the data instead of storing it.",
  },
  ...timestampFields,
  {
    name: "options",
    type: "ItemOption[]",
    description: "Add-ons or variations, ordered by order.",
    fields: optionFields,
  },
];

const categoryBaseFields: ApiField[] = [
  idField,
  locationIdField,
  { name: "name", type: "string" },
  { name: "description", type: "string | null" },
  { name: "order", type: "number", description: "Display order, ascending." },
  {
    name: "isVisible",
    type: "boolean",
    description: "When false, the business has hidden this category.",
  },
];

const subcategoryFields: ApiField[] = [
  ...categoryBaseFields.slice(0, 2),
  {
    name: "parentId",
    type: UUID,
    description: "The parent category's id.",
  },
  ...categoryBaseFields.slice(2),
  ...timestampFields,
];

const subcategoryWithItemsFields: ApiField[] = [
  ...subcategoryFields,
  {
    name: "items",
    type: "Item[]",
    description: "Ordered by order.",
    fields: itemFields,
  },
];

const menuCategoryFields: ApiField[] = [
  ...categoryBaseFields.slice(0, 2),
  {
    name: "parentId",
    type: "null",
    description: "Always null: these are top-level categories.",
  },
  ...categoryBaseFields.slice(2),
  ...timestampFields,
  {
    name: "items",
    type: "Item[]",
    description: "Items directly in this category, ordered by order.",
    fields: itemFields,
  },
  {
    name: "subcategories",
    type: "Subcategory[]",
    description: "Ordered by order. Each has its own items.",
    fields: subcategoryWithItemsFields,
  },
];

const locationFields: ApiField[] = [
  idField,
  { name: "address", type: "string" },
  { name: "zip", type: "string | null" },
  { name: "country", type: "string | null" },
  { name: "state", type: "string | null" },
  { name: "city", type: "string | null" },
  { name: "parking", type: "boolean", description: "Parking is available." },
  { name: "isActive", type: "boolean" },
  {
    name: "enableHours",
    type: "boolean",
    description: "Whether the business shows opening hours for this location.",
  },
  ...timestampFields,
];

function hourFields(dayIdName: "regularDayId" | "specialDayId"): ApiField[] {
  return [
    idField,
    { name: dayIdName, type: UUID, description: "The day this belongs to." },
    { name: "openTime", type: "string (HH:MM, 24-hour)" },
    { name: "closeTime", type: "string (HH:MM, 24-hour)" },
    { name: "title", type: "string | null" },
    { name: "note", type: "string | null" },
    {
      name: "isDisabled",
      type: "boolean",
      description: "When true, ignore these hours.",
    },
    ...timestampFields,
  ];
}

// --------------------
// Sample data (made up)

const SAMPLE_DATE = "2026-01-15T18:30:00.000Z";
const SAMPLE_UPDATED = "2026-03-02T16:05:12.000Z";
const timestamps = { createdAt: SAMPLE_DATE, updatedAt: SAMPLE_UPDATED };

const BUSINESS_ID = "6b1f3c2e-8d4a-4f6b-9a1e-2c7d5e8f9a01";
const LOCATION_ID = "0c9e8d7f-6a5b-4c3d-8e2f-1a0b9c8d7e6f";
const SECOND_LOCATION_ID = "1d0f9e8a-7b6c-4d5e-9f3a-2b1c0d9e8f7a";

const TACOS_ID = "a1b2c3d4-0001-4a5b-8c6d-7e8f9a0b1c2d";
const DRINKS_ID = "a1b2c3d4-0002-4a5b-8c6d-7e8f9a0b1c2d";
const AGUAS_ID = "a1b2c3d4-0003-4a5b-8c6d-7e8f9a0b1c2d";

const ASADA_ID = "b2c3d4e5-0001-4b6c-9d7e-8f9a0b1c2d3e";
const PASTOR_ID = "b2c3d4e5-0002-4b6c-9d7e-8f9a0b1c2d3e";
const HORCHATA_ID = "b2c3d4e5-0003-4b6c-9d7e-8f9a0b1c2d3e";
const SODA_ID = "b2c3d4e5-0004-4b6c-9d7e-8f9a0b1c2d3e";

function sampleImageUrl(itemId: string): string {
  return (
    `https://your-bucket.s3.us-west-2.amazonaws.com/businesses/${BUSINESS_ID}/items/${itemId}.webp` +
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=EXAMPLE&X-Amz-Date=20260315T120000Z" +
    "&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=example"
  );
}

const sampleAsada = {
  id: ASADA_ID,
  locationId: LOCATION_ID,
  categoryId: TACOS_ID,
  name: "Carne Asada Taco",
  description: "Grilled steak, onion, and cilantro on a corn tortilla.",
  containsList: ["beef", "onion", "cilantro", "corn"],
  calories: 210,
  price: "3.5",
  order: 1,
  isAvailable: true,
  slug: "carne-asada-taco",
  imageKey: sampleImageUrl(ASADA_ID),
  ...timestamps,
  options: [
    {
      id: "c3d4e5f6-0001-4c7d-8e9f-0a1b2c3d4e5f",
      itemId: ASADA_ID,
      name: "Add cheese",
      price: "0.75",
      order: 1,
      isAvailable: true,
      ...timestamps,
    },
    {
      id: "c3d4e5f6-0002-4c7d-8e9f-0a1b2c3d4e5f",
      itemId: ASADA_ID,
      name: "Flour tortilla",
      price: "0",
      order: 2,
      isAvailable: true,
      ...timestamps,
    },
  ],
};

const samplePastor = {
  id: PASTOR_ID,
  locationId: LOCATION_ID,
  categoryId: TACOS_ID,
  name: "Al Pastor Taco",
  description: null,
  containsList: ["pork", "pineapple"],
  calories: null,
  price: "3.25",
  order: 2,
  isAvailable: false,
  slug: "al-pastor-taco",
  imageKey: null,
  ...timestamps,
  options: [],
};

const sampleHorchata = {
  id: HORCHATA_ID,
  locationId: LOCATION_ID,
  categoryId: AGUAS_ID,
  name: "Horchata",
  description: "Rice and cinnamon agua fresca.",
  containsList: ["rice", "milk", "cinnamon"],
  calories: 180,
  price: "4",
  order: 1,
  isAvailable: true,
  slug: "horchata",
  imageKey: sampleImageUrl(HORCHATA_ID),
  ...timestamps,
  options: [
    {
      id: "c3d4e5f6-0003-4c7d-8e9f-0a1b2c3d4e5f",
      itemId: HORCHATA_ID,
      name: "Large",
      price: "1.5",
      order: 1,
      isAvailable: true,
      ...timestamps,
    },
  ],
};

const sampleAguas = {
  id: AGUAS_ID,
  locationId: LOCATION_ID,
  parentId: DRINKS_ID,
  name: "Aguas Frescas",
  description: null,
  order: 1,
  isVisible: true,
  ...timestamps,
};

const sampleTacosCategory = {
  id: TACOS_ID,
  locationId: LOCATION_ID,
  parentId: null,
  name: "Tacos",
  description: "Served with salsa verde.",
  order: 1,
  isVisible: true,
  ...timestamps,
  items: [sampleAsada, samplePastor],
  subcategories: [],
};

const sampleSoda = {
  id: SODA_ID,
  locationId: LOCATION_ID,
  categoryId: DRINKS_ID,
  name: "Mexican Coke",
  description: null,
  containsList: [],
  calories: 150,
  price: "3",
  order: 1,
  isAvailable: true,
  slug: "mexican-coke",
  imageKey: null,
  ...timestamps,
  options: [
    {
      id: "c3d4e5f6-0004-4c7d-8e9f-0a1b2c3d4e5f",
      itemId: SODA_ID,
      name: "Diet",
      price: "0",
      order: 1,
      isAvailable: false,
      ...timestamps,
    },
  ],
};

const sampleDrinksCategory = {
  id: DRINKS_ID,
  locationId: LOCATION_ID,
  parentId: null,
  name: "Drinks",
  description: null,
  order: 2,
  isVisible: true,
  ...timestamps,
  items: [sampleSoda],
  subcategories: [{ ...sampleAguas, items: [sampleHorchata] }],
};

const sampleLocation = {
  id: LOCATION_ID,
  address: "123 Main St",
  zip: "90210",
  country: "US",
  state: "CA",
  city: "Los Angeles",
  parking: true,
  isActive: true,
  enableHours: true,
  ...timestamps,
};

function sampleHour(
  dayIdName: "regularDayId" | "specialDayId",
  dayId: string,
  id: string,
  openTime: string,
  closeTime: string,
  title: string | null = null,
  note: string | null = null,
) {
  return {
    id,
    [dayIdName]: dayId,
    openTime,
    closeTime,
    title,
    note,
    isDisabled: false,
    ...timestamps,
  };
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const sampleDays = DAY_NAMES.map((dayOfWeek, index) => {
  const dayId = `d4e5f6a7-000${index + 1}-4d8e-9f0a-1b2c3d4e5f6a`;
  const isClosed = dayOfWeek === "Monday";

  return {
    id: dayId,
    locationId: LOCATION_ID,
    dayOfWeek,
    isClosed,
    ...timestamps,
    hour: isClosed
      ? null
      : sampleHour(
          "regularDayId",
          dayId,
          `e5f6a7b8-000${index + 1}-4e9f-8a1b-2c3d4e5f6a7b`,
          "11:00",
          dayOfWeek === "Saturday" ? "23:00" : "21:00",
        ),
    specialHours:
      dayOfWeek === "Sunday"
        ? [
            sampleHour(
              "specialDayId",
              dayId,
              "f6a7b8c9-0001-4f0a-9b2c-3d4e5f6a7b8c",
              "08:00",
              "11:00",
              "Breakfast",
              "Breakfast menu only",
            ),
          ]
        : [],
  };
});

// --------------------
// Endpoints

export const PUBLIC_API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "business",
    title: "Business",
    method: "GET",
    path: "/api/business",
    description:
      "Basic information about the business the API key belongs to.",
    requiresLocation: false,
    responseType: "object",
    fields: [
      idField,
      { name: "name", type: "string" },
      { name: "slug", type: "string" },
      { name: "domain", type: "string | null" },
      {
        name: "imageKey",
        type: "string | null",
        description:
          "The business logo as a signed image URL (not a key) that expires 1 hour after the response, or null if no logo is set.",
      },
      ...timestampFields,
    ],
    example: {
      id: BUSINESS_ID,
      name: "Sample Taqueria",
      slug: "sample-taqueria",
      domain: "sampletaqueria.com",
      imageKey:
        `https://your-bucket.s3.us-west-2.amazonaws.com/businesses/${BUSINESS_ID}/logo.webp` +
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=example",
      ...timestamps,
    },
  },
  {
    id: "locations",
    title: "Locations",
    method: "GET",
    path: "/api/business/locations",
    description:
      "Every location of the business, active locations first, then oldest first. Use a location's id as the x-location-id header for the location-scoped endpoints.",
    requiresLocation: false,
    responseType: "array",
    fields: locationFields,
    example: [
      sampleLocation,
      {
        ...sampleLocation,
        id: SECOND_LOCATION_ID,
        address: "500 Ocean Ave",
        zip: null,
        city: "Santa Monica",
        parking: false,
        isActive: false,
        enableHours: false,
      },
    ],
  },
  {
    id: "schedule",
    title: "Schedule",
    method: "GET",
    path: "/api/business/locations/schedule",
    description:
      "The location with its weekly schedule. Days are sorted Monday to Sunday. A day has one regular hour range (hour) and any number of special hour ranges, ordered by openTime.",
    requiresLocation: true,
    responseType: "object",
    fields: [
      ...locationFields,
      {
        name: "days",
        type: "Day[]",
        fields: [
          idField,
          locationIdField,
          {
            name: "dayOfWeek",
            type: '"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"',
          },
          { name: "isClosed", type: "boolean" },
          ...timestampFields,
          {
            name: "hour",
            type: "Hour | null",
            description: "The regular opening hours, or null if none are set.",
            fields: hourFields("regularDayId"),
          },
          {
            name: "specialHours",
            type: "Hour[]",
            description: "Extra ranges such as a breakfast or happy hour.",
            fields: hourFields("specialDayId"),
          },
        ],
      },
    ],
    example: { ...sampleLocation, days: sampleDays },
  },
  {
    id: "contacts",
    title: "Contacts",
    method: "GET",
    path: "/api/business/contacts",
    description:
      "Phone numbers and emails for the location. Business contacts come first, then personal contacts, newest first.",
    requiresLocation: true,
    responseType: "object",
    fields: [
      {
        name: "contacts",
        type: "Contact[]",
        fields: [
          idField,
          locationIdField,
          { name: "phoneNumber", type: "string | null" },
          { name: "email", type: "string | null" },
          {
            name: "isPersonal",
            type: "boolean",
            description: "A person's contact rather than the business's.",
          },
          ...timestampFields,
        ],
      },
    ],
    example: {
      contacts: [
        {
          id: "17a8b9c0-0001-4a1b-8c2d-3e4f5a6b7c8d",
          locationId: LOCATION_ID,
          phoneNumber: "(555) 010-2000",
          email: "hello@sampletaqueria.com",
          isPersonal: false,
          ...timestamps,
        },
        {
          id: "17a8b9c0-0002-4a1b-8c2d-3e4f5a6b7c8d",
          locationId: LOCATION_ID,
          phoneNumber: null,
          email: "owner@sampletaqueria.com",
          isPersonal: true,
          ...timestamps,
        },
      ],
    },
  },
  {
    id: "socials",
    title: "Socials",
    method: "GET",
    path: "/api/business/socials",
    description:
      "Social media profiles for the location, sorted by domain, then newest first.",
    requiresLocation: true,
    responseType: "object",
    fields: [
      {
        name: "socials",
        type: "Social[]",
        fields: [
          idField,
          locationIdField,
          { name: "domain", type: "string", description: 'e.g. "instagram.com".' },
          { name: "profileName", type: "string" },
          { name: "url", type: "string", description: "The full profile URL." },
          {
            name: "icon",
            type: "string",
            description:
              "A signed icon image URL that expires 1 hour after the response.",
          },
          ...timestampFields,
        ],
      },
    ],
    example: {
      socials: [
        {
          id: "28b9c0d1-0001-4b2c-9d3e-4f5a6b7c8d9e",
          locationId: LOCATION_ID,
          domain: "instagram.com",
          profileName: "sampletaqueria",
          url: "https://instagram.com/sampletaqueria",
          icon:
            "https://your-bucket.s3.us-west-2.amazonaws.com/social-icons/instagram.webp" +
            "?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=example",
          ...timestamps,
        },
      ],
    },
  },
  {
    id: "categories",
    title: "Categories",
    method: "GET",
    path: "/api/business/categories",
    description:
      "The menu's category tree without items: top-level categories and their subcategories, ordered by order. Use the menu endpoint to get items.",
    requiresLocation: true,
    responseType: "object",
    fields: [
      {
        name: "categories",
        type: "Category[]",
        fields: [
          ...categoryBaseFields,
          {
            name: "subcategories",
            type: "Subcategory[]",
            fields: subcategoryFields,
          },
          ...timestampFields,
        ],
      },
    ],
    example: {
      categories: [
        {
          id: TACOS_ID,
          locationId: LOCATION_ID,
          name: "Tacos",
          description: "Served with salsa verde.",
          order: 1,
          isVisible: true,
          subcategories: [],
          ...timestamps,
        },
        {
          id: DRINKS_ID,
          locationId: LOCATION_ID,
          name: "Drinks",
          description: null,
          order: 2,
          isVisible: true,
          subcategories: [sampleAguas],
          ...timestamps,
        },
      ],
    },
  },
  {
    id: "category",
    title: "Category",
    method: "GET",
    path: "/api/business/categories/{categoryId}",
    description:
      "One category with its items and subcategories, in the same shape as a category in the menu endpoint. The categories array has one entry, or is empty if the category does not exist at this location.",
    requiresLocation: true,
    pathParams: [
      { name: "categoryId", description: "A category id from the menu or categories endpoint." },
    ],
    responseType: "object",
    fields: [
      { name: "categories", type: "Category[]", fields: menuCategoryFields },
    ],
    example: { categories: [sampleDrinksCategory] },
  },
  {
    id: "menu",
    title: "Menu",
    method: "GET",
    path: "/api/business/menu",
    description:
      "The full menu for the location: top-level categories with their items and subcategories, each subcategory with its own items. Everything is ordered by order.",
    requiresLocation: true,
    responseType: "object",
    fields: [
      { name: "categories", type: "Category[]", fields: menuCategoryFields },
    ],
    example: { categories: [sampleTacosCategory, sampleDrinksCategory] },
  },
];

export const PUBLIC_API_ERRORS: { status: number; when: string }[] = [
  { status: 400, when: "A location-scoped endpoint was called without the x-location-id header." },
  { status: 401, when: "The API key is missing, invalid, or inactive." },
  { status: 403, when: "Called from a browser origin that is not in the key's allowed origins." },
  { status: 404, when: "The x-location-id does not belong to the key's business." },
  { status: 429, when: "Rate limit reached. The body includes retryAfterMs." },
  { status: 500, when: "Something went wrong on the platform." },
];
