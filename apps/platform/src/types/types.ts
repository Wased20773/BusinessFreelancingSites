import type { Category } from "@business-freelancer/database";

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
  name: string | null | undefined;
  accessLevel: "owner" | "admin" | "staff";
};

/*
 * Shared by both the desktop sidebar and mobile navigation.
 */
export type DashboardNavProps = {
  currentBusiness: DashboardNavBusiness;
  currentAccount: DashboardNavAccount;
};
