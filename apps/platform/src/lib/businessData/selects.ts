import type { Prisma } from "@business-freelancer/database";
import { ADD_ON_LINKS_QUERY } from "@/lib/addOns/resolveAddOns";

/*
 *   The Prisma selects behind the public API (/api/business/*). The routes
 *   and the Business JSON download (lib/businessData/exportBusiness.ts)
 *   share them, so the download always has the same shape as the API.
 *
 *   `withSync` adds syncGroupId and isSynced. Those are only sent to the
 *   dashboard (a session), never to an API key.
 **/

const syncFields = (withSync: boolean) =>
  withSync ? { syncGroupId: true, isSynced: true } : {};

export const BUSINESS_FIELDS = {
  id: true,
  name: true,
  slug: true,
  domain: true,
  imageKey: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const LOCATION_FIELDS = {
  id: true,
  address: true,
  zip: true,
  country: true,
  state: true,
  city: true,
  parking: true,
  isActive: true,
  enableHours: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const LOCATION_ORDER: Prisma.LocationOrderByWithRelationInput[] = [
  { isActive: "desc" },
  { createdAt: "asc" },
];

const HOUR_FIELDS = {
  openTime: true,
  closeTime: true,
  title: true,
  note: true,
  isDisabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const SCHEDULE_DAYS_QUERY = {
  select: {
    id: true,
    locationId: true,
    dayOfWeek: true,
    isClosed: true,
    createdAt: true,
    updatedAt: true,
    hour: {
      select: { id: true, regularDayId: true, ...HOUR_FIELDS },
    },
    specialHours: {
      orderBy: { openTime: "asc" },
      select: { id: true, specialDayId: true, ...HOUR_FIELDS },
    },
  },
} as const;

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Days are stored in any order; the API always sends Monday first.
export function sortDays<T extends { dayOfWeek: string }>(days: T[]): T[] {
  return days.sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
  );
}

const MENU_ITEMS_QUERY = {
  orderBy: { order: "asc" },
  select: {
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
    createdAt: true,
    updatedAt: true,
    // Resolved into addOnGroups before sending.
    addOnsVaryByOption: true,
    addOns: ADD_ON_LINKS_QUERY,

    options: {
      orderBy: { order: "asc" },
      select: {
        id: true,
        itemId: true,
        name: true,
        price: true,
        order: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
        addOns: ADD_ON_LINKS_QUERY,
      },
    },
  },
} as const;

const CATEGORY_FIELDS = {
  id: true,
  locationId: true,
  parentId: true,
  name: true,
  description: true,
  order: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Parent categories, each with its items and subcategories (and theirs).
// Run the result through resolveMenuAddOns before sending it.
export function menuCategoriesQuery(withSync: boolean) {
  return {
    where: { parentId: null },
    orderBy: { order: "asc" },
    select: {
      ...CATEGORY_FIELDS,
      ...syncFields(withSync),
      items: MENU_ITEMS_QUERY,
      subcategories: {
        orderBy: { order: "asc" },
        select: {
          ...CATEGORY_FIELDS,
          ...syncFields(withSync),
          items: MENU_ITEMS_QUERY,
        },
      },
    },
  } as const;
}

export function contactsQuery(withSync: boolean) {
  return {
    orderBy: [
      { isPersonal: "asc" },
      { createdAt: "desc" },
    ] as Prisma.ContactOrderByWithRelationInput[],
    select: {
      id: true,
      locationId: true,
      phoneNumber: true,
      email: true,
      isPersonal: true,
      ...syncFields(withSync),
      createdAt: true,
      updatedAt: true,
    },
  } as const;
}

// `icon` is a private object key; sign it before sending.
export function socialsQuery(withSync: boolean) {
  return {
    orderBy: [
      { domain: "asc" },
      { createdAt: "desc" },
    ] as Prisma.SocialOrderByWithRelationInput[],
    select: {
      id: true,
      locationId: true,
      domain: true,
      profileName: true,
      url: true,
      icon: true,
      ...syncFields(withSync),
      createdAt: true,
      updatedAt: true,
    },
  } as const;
}
