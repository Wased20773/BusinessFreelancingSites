export type DashboardLink = {
  name: string;
  href: string;
};

export const dashboardLinks: DashboardLink[] = [
  {
    name: "Overview",
    href: "/dashboard",
  },
  {
    name: "Business",
    href: "/dashboard/business",
  },
  {
    name: "Users",
    href: "/dashboard/users",
  },
  {
    name: "Categories",
    href: "/dashboard/categories",
  },
  {
    name: "Locations",
    href: "/dashboard/locations",
  },
  {
    name: "Contacts",
    href: "/dashboard/contacts",
  },
  {
    name: "Socials",
    href: "/dashboard/socials",
  },
];
