import { signImageKeys } from "@/app/api/route_helper";
import { ADD_ON_GROUP_SELECT, ADD_ON_SELECT } from "@/lib/addOns/addOnRoutes";
import { resolveMenuAddOns } from "@/lib/addOns/resolveAddOns";
import {
  BUSINESS_FIELDS,
  contactsQuery,
  LOCATION_FIELDS,
  LOCATION_ORDER,
  menuCategoriesQuery,
  SCHEDULE_DAYS_QUERY,
  socialsQuery,
  sortDays,
} from "@/lib/businessData/selects";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/s3/get-url";

/*
 *   Everything in the dashboard for one business, grouped by location like
 *   the public API: each location has its schedule, menu, add-ons,
 *   contacts and socials, in the same shape the API returns them.
 *
 *   Two differences from the API:
 *     - syncGroupId and isSynced are included (like a dashboard request).
 *     - Each location also lists every add-on group with all its add-ons,
 *       available or not, as the Add-ons page shows them.
 *
 *   Never included: API keys, billing, or the business's users.
 *
 *   Images are signed URLs that expire after an hour, like the API's.
 *   Returns null when the business doesn't exist.
 **/
export async function exportBusiness(businessId: string) {
  const [business, locations] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: BUSINESS_FIELDS,
    }),
    prisma.location.findMany({
      where: { businessId },
      orderBy: LOCATION_ORDER,
      select: {
        ...LOCATION_FIELDS,
        days: SCHEDULE_DAYS_QUERY,
        categories: menuCategoriesQuery(true),
        addOnGroups: {
          orderBy: { order: "asc" },
          select: {
            ...ADD_ON_GROUP_SELECT,
            addOns: { orderBy: { order: "asc" }, select: ADD_ON_SELECT },
          },
        },
        contacts: contactsQuery(true),
        socials: socialsQuery(true),
      },
    }),
  ]);

  if (!business) return null;

  const exportedLocations = await Promise.all(
    locations.map(async (location) => {
      sortDays(location.days);

      const socials = await Promise.all(
        location.socials.map(async (social) => ({
          ...social,
          icon: await getObjectUrl(social.icon),
        })),
      );

      return resolveMenuAddOns({ ...location, socials });
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    business: await signImageKeys(business),
    locations: await signImageKeys(exportedLocations),
  };
}

// e.g. "tacos-el-gordo-2026-11-15.json"
export function exportFileName(slug: string, date = new Date()): string {
  return `${slug}-${date.toISOString().slice(0, 10)}.json`;
}
