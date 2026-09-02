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
      href: `/businesses/${businessId}/members`,
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
