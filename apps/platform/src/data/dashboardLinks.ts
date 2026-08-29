export type DashboardLink = {
  name: string;
  href: string;
};

export const dashboardLinks = (
  businessId: string,
  locationId: string,
): DashboardLink[] => {
  const dashboardPath = `/businesses/${businessId}/locations/${locationId}/dashboard`;

  return [
    {
      name: "Overview",
      href: dashboardPath,
    },
    {
      name: "Business",
      href: `${dashboardPath}/business`,
    },
    {
      name: "Users",
      href: `${dashboardPath}/users`,
    },
    {
      name: "Menu",
      href: `${dashboardPath}/menu`,
    },
    {
      name: "Location",
      href: `${dashboardPath}/location`,
    },
    {
      name: "Contacts",
      href: `${dashboardPath}/contacts`,
    },
    {
      name: "Socials",
      href: `${dashboardPath}/socials`,
    },
  ];
};
