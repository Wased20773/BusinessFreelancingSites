import type {
  Category,
  Business,
  BusinessUser,
  User,
  Social,
  Contact,
  AccessLevel,
} from "@business-freelancer/database";

// --------------------
// MODEL TYPES

// Business
export type BusinessJson = Omit<Business, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
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
};

export type CategoryComplete = CategoryJson & {
  subcategories: CategoryJson[];
};

export type CategoriesResponse = {
  categories: CategoryComplete[];
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

// --------------------
// DASHBOARD SPECIFIC

/*
 * Only contains the business information displayed by the
 * dashboard navigation components.
 */
export type DashboardNavBusiness = {
  name: string;
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
};
