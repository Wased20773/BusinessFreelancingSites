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
  AddOn,
  AddOnGroup,
  Item,
  ItemOption,
} from "@business-freelancer/database/generated/prisma/client";
import type {
  PlanTier,
  SubscriptionStatus,
} from "@business-freelancer/database/generated/prisma/enums";
import type { PlanKey, PlanLimits } from "@/lib/billing/plans";
import { Dispatch, SetStateAction } from "react";

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
    "id" | "name" | "keyPrefix" | "isActive" | "allowedOrigins" | "createdAt"
  >;
};

export type UpdateBusinessApiKeyResponse = Pick<
  BusinessApiKeyJson,
  | "id"
  | "name"
  | "keyPrefix"
  | "isActive"
  | "allowedOrigins"
  | "createdAt"
  | "updatedAt"
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
  isPayer?: boolean; // pays for the business's plan (members list only)
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
  // Dashboard only: the item's own saved add-on links (see add-ons-plan.md).
  addOns?: AddOnLinkJson[];
};

export type ItemOptionsJson = Omit<ItemOption, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  // Dashboard only: this option's saved add-on links.
  addOns?: AddOnLinkJson[];
};

// Add-ons
// A saved link from an item or option. price null = the add-on's default.
export type AddOnLinkJson = {
  addOnId: string;
  price: string | number | null;
};

export type AddOnJson = Omit<AddOn, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  // How many items use it (counted once per item).
  usedByItems: number;
};

export type AddOnGroupJson = Omit<AddOnGroup, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  addOns: AddOnJson[];
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
  // Unset when no business is selected (e.g. Settings opened from /businesses).
  accessLevel?: "developer" | "owner" | "admin" | "staff";
  image?: string | null;
  workspaceTourVersion?: number;
  dashboardTourVersion?: number;
};

/*
 * Shared by both the desktop sidebar and mobile navigation.
 */
export type DashboardNavProps = {
  isOpen?: boolean;
  setIsOpen?: Dispatch<SetStateAction<boolean>>;
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

// Billing
export type BillingJson = {
  planKey: PlanKey;
  limits: PlanLimits;
  usage: {
    locations: number;
    locationSlots: number;
    members: number;
    apiKeys: number;
  };
  selfServeSlotCap: number;
  subscription: {
    tier: PlanTier;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    payer: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    isPayer: boolean;
    payerIsMember: boolean; // false once the payer left or was removed
  } | null;
};

// GET /api/account/billing: everything one user pays for.
export type AccountPaymentJson = {
  id: string;
  // "credit": a downgrade left unused time as account credit.
  kind: "subscription" | "location_slot" | "credit";
  businessId: string | null;
  businessName: string | null; // null when the business was deleted
  description: string;
  amount: number; // what it cost, in dollars; negative for "credit"
  paidFromCredit: number; // part of amount covered by account credit, in dollars
  currency: string;
  paidAt: string;
  receiptUrl: string | null;
};

export type AccountBillingJson = {
  subscriptions: {
    businessId: string;
    businessName: string;
    tier: PlanTier;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    paymentMethodId: string | null; // the saved payment method it bills
    isMember: boolean; // false once the payer was removed from the business
  }[];
  payments: AccountPaymentJson[];
  totals: PriceJson[]; // charged to the card, one per currency
  credit: PriceJson | null; // account credit still unused
  paymentMethods: AccountPaymentMethodJson[];
};

// A saved payment method (a card, Link, ...). Card numbers are entered and
// stored only by Stripe.
export type AccountPaymentMethodJson = {
  id: string;
  type: string; // Stripe's type: "card", "link", ...
  label: string; // "Visa •••• 4242", "Link (you@example.com)"
  expires: string | null; // "04/29" for cards; null otherwise
  usedBy: string[]; // names of the businesses whose plan this card pays
};

export type PriceJson = {
  amount: number;
  currency: string;
};

export type BillingPricesJson = {
  tiers: Record<PlanTier, PriceJson>;
  locationSlot: PriceJson;
};
