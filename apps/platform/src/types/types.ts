import type {
  Category,
  Business,
  User,
  Social,
  Contact,
  BusinessApiKey,
  Location,
  LocationDay,
  Hour,
} from "@business-freelancer/database";
export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];
import {
  Item,
  ItemOption,
} from "@business-freelancer/database/generated/prisma/client";

// --------------------
// ENUMS

// Access Level
export const ACCESS_LEVEL = {
  developer: "developer",
  owner: "owner",
  admin: "admin",
  staff: "staff",
} as const;

// --------------------
// MODEL TYPES

// API Keys
export type BusinessApiKeyJson = Omit<
  BusinessApiKey,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export type CreateBusinessApiKeyResponse = {
  apiKey: string;
  key: Pick<
    BusinessApiKeyJson,
    "id" | "name" | "keyPrefix" | "isActive" | "createdAt"
  >;
};

export type UpdateBusinessApiKeyResponse = Pick<
  BusinessApiKeyJson,
  "id" | "name" | "keyPrefix" | "isActive" | "createdAt" | "updatedAt"
>;

// Business
export type BusinessJson = Omit<Business, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type BusinessOwnerShip = {
  id: string;
  role: { accessLevel: AccessLevel };
  business: BusinessJson;
};

// BusinessUser
export type BusinessUserJson = {
  id: string;
  businessId?: string;
  userId?: string;
  roleId?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name?: string;
    username?: string;
    email?: string;
    emailVerified?: string;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  role: {
    id?: string;
    accessLevel?: AccessLevel;
    description?: string;
  };
};

export type UserJson = Omit<
  User,
  "emailVerified" | "createdAt" | "updatedAt"
> & {
  emailVerified: string;
  createdAt: string;
  updatedAt: string;
};

// Category
export type CategoryJson = Omit<Category, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  items?: ItemJson[];
  subcategories?: CategoryJson[];
};

// Item
export type ItemJson = Omit<Item, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  options: ItemOptionsJson[];
};

export type ItemOptionsJson = Omit<ItemOption, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// Contact
export type ContactJson = Omit<Contact, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// Social
export type SocialJson = Omit<Social, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// Location
export type LocationJson = Omit<Location, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  days: LocationDayJson[];
};

export type LocationDayJson = Omit<LocationDay, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  hour: HourJson;
  specialHours: HourJson[];
};

export type HourJson = Omit<Hour, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// --------------------
// DASHBOARD SPECIFIC

/*
 * Only contains the business information displayed by the
 * dashboard navigation components.
 */
export type DashboardNavBusiness = {
  name: string;
  imageKey: string | null;
};

/*
 * Only contains the account information displayed by the
 * dashboard navigation components.
 */
export type DashboardNavAccount = {
  name?: string | null;
  accessLevel: "developer" | "owner" | "admin" | "staff";
  image?: string | null;
};

/*
 * Shared by both the desktop sidebar and mobile navigation.
 */
export type DashboardNavProps = {
  currentBusiness: DashboardNavBusiness;
  currentAccount: DashboardNavAccount;
  variant: "workspace" | "dashboard" | "settings";
  navLinks: {
    name: string;
    href: string;
  }[];
  businesses?: BusinessOwnerShip[];
  businessId?: string;
  locations?: LocationJson[];
  onNavigate?: (href: string) => void;
};

// Overview Page
export type DashboardOverviewJson = {
  id: string;
  businessId: string;
  address: string;
  zip: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  parking: boolean;
  isActive: boolean;
  enableHours: boolean;
  createdAt: string;
  updatedAt: string;
  days: LocationDayJson[];
  categories: CategoryJson[];
  items: ItemJson[];
  contacts: ContactJson[];
  socials: SocialJson[];
};
