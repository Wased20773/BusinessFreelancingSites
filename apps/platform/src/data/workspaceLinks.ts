export type WorkspaceLinks = {
  name: string;
  href: string;
};

export const workspaceLinks = (businessId: string): WorkspaceLinks[] => {
  return [
    {
      name: "Overview",
      href: `/businesses/${businessId}`,
    },
    {
      name: "Members",
      href: `/businesses/${businessId}/users`,
    },
    {
      name: "API Keys",
      href: `/businesses/${businessId}/api-keys`,
    },
    {
      name: "Settings",
      href: `/businesses/${businessId}/settings`,
    },
  ];
};
