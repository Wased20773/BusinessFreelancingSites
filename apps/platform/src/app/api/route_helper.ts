import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DayOfWeek, Prisma } from "@business-freelancer/database";
import { isSupportedImageContentType } from "@/lib/s3/keys";
import { generateBusinessApiKey } from "@/lib/api-keys/generateBusinessApiKey";

type OrderModel = {
  findFirst: (args: {
    where: Record<string, unknown>;
    orderBy: { order: "desc" };
    select: { order: true };
  }) => Promise<{ order: number } | null>;
};

type SyncModel = {
  findFirst: (args: {
    where: Record<string, unknown>;
    select: {
      id: true;
      syncGroupId: true;
    };
  }) => Promise<{
    id: string;
    syncGroupId: string | null;
    isSynced: boolean;
  } | null>;

  create: (args: {
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }) => Promise<unknown>;

  createMany: (args: {
    data: Record<string, unknown>[];
  }) => Promise<{ count: number }>;

  update: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    select?: Record<string, unknown>;
  }) => Promise<unknown>;

  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<unknown>;

  delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;

  deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
};

type SyncPrismaModel =
  | typeof prisma.contact
  | typeof prisma.category
  | typeof prisma.social
  | typeof prisma.item
  | typeof prisma.itemOption
  | typeof prisma.locationDay;

type LocationResourceName =
  | "business"
  | "category"
  | "contact"
  | "day"
  | "location"
  | "menu"
  | "item"
  | "social"
  | "schedule";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/*
 *   Gets the slug from the HTTP request via the search param.
 **/
export function getSlug(request: Request): string {
  // Get the URL from the request
  const { searchParams }: URL = new URL(request.url);
  const slug: string | null = searchParams.get("slug");

  if (!slug) {
    throw new Error("Missing business slug");
  }

  return slug;
}

/*
 *   Gets the response of a businesses data where <T> is the object of the
 *   Corresponding select "items" in the query.
 **/
export async function getLocationResponse<T extends Prisma.LocationSelect>(
  businessId: string,
  locationId: string,
  select: T,
  resourceName: LocationResourceName,
): Promise<NextResponse> {
  try {
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId: businessId,
      },
      select,
    });

    if (!location) {
      return NextResponse.json(
        { error: `Location not found while fetching ${resourceName} data` },
        { status: 404 },
      );
    }

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    console.error(`Failed to fetch ${resourceName} data:`, error);

    return NextResponse.json(
      { error: `Failed to fetch ${resourceName} data` },
      { status: 500 },
    );
  }
}

export function validateBusinessLocationParams(
  businessId?: string,
  locationId?: string,
): NextResponse | null {
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  if (!locationId) {
    return NextResponse.json({ error: "Missing locationId" }, { status: 400 });
  }

  return null;
}

export async function createSyncedResource({
  body,
  model,
  resourceName,
  businessId,
  locationId,
  data,
  select,
}: {
  body: Record<string, unknown>;
  model: SyncPrismaModel;
  resourceName: LocationResourceName;
  businessId: string;
  locationId: string;
  data: Record<string, unknown>;
  select: Record<string, unknown>;
}): Promise<NextResponse> {
  const syncModel = model as unknown as SyncModel;

  if (typeof body.isSynced !== "boolean") {
    return NextResponse.json(
      { error: "Synchronization setting was not found" },
      { status: 400 },
    );
  }

  /*
   * If synchronization is ON, create the resource
   * for every location belonging to this business.
   */
  if (body.isSynced === true) {
    const locations = await prisma.location.findMany({
      where: {
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (locations.length === 0) {
      return NextResponse.json(
        { error: "No locations were found for this business" },
        { status: 400 },
      );
    }

    /*
     * Generate ONE synchronization group ID.
     * Every created resource gets this exact same value.
     */
    const syncGroupId = crypto.randomUUID();

    const createdResources = await syncModel.createMany({
      data: locations.map((location) => ({
        ...data,
        locationId: location.id,
        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: `Synchronized ${resourceName}'s created successfully`,
        count: createdResources.count,
        syncGroupId,
      },
      { status: 201 },
    );
  }

  /*
   * Otherwise only create the resource
   * for the currently selected location.
   */
  const createdResource = await syncModel.create({
    data: {
      ...data,
      locationId,
      syncGroupId: null,
      isSynced: false,
    },
    select,
  });

  return NextResponse.json(createdResource, {
    status: 201,
  });
}

export async function updateSyncedResource({
  body,
  model,
  resourceName,
  id,
  locationId,
  data,
  select,
}: {
  body: Record<string, unknown>;
  model: SyncPrismaModel;
  resourceName: LocationResourceName;
  id: string;
  locationId: string;
  data: Record<string, unknown>;
  select: Record<string, unknown>;
}): Promise<NextResponse> {
  const syncModel = model as unknown as SyncModel;

  if (typeof body.isSynced !== "boolean") {
    return NextResponse.json(
      { error: "Synchronization setting was not found" },
      { status: 400 },
    );
  }

  /*
   * We need the synchronization information before deciding
   * whether this update affects one contact or the whole group
   */
  const resource = await syncModel.findFirst({
    where: {
      id,
      locationId,
    },
    select: {
      id: true,
      syncGroupId: true,
    },
  });

  if (!resource) {
    return NextResponse.json(
      { error: `This ${resourceName} does not exist in our records` },
      { status: 404 },
    );
  }

  /*
   * If this resource is synchronized, update every resource
   * that belongs to the same synchronization group while making
   * sure only those synced get updated
   */
  if (resource.syncGroupId && body.isSynced === true) {
    await syncModel.updateMany({
      where: {
        syncGroupId: resource.syncGroupId,

        // Must check if synced is ON and selecting itself as well since
        // the database record could've been false
        OR: [{ isSynced: true }, { id: resource.id }],
      },
      data: {
        ...data,
        isSynced: true,
      },
    });

    return NextResponse.json(
      { message: `Synchronized ${resourceName}'s updated successfully` },
      { status: 200 },
    );
  }

  /*
   * Otherwise only update this location's contact
   */
  const updatedResource = await syncModel.update({
    where: {
      id: resource.id,
      locationId,
    },
    data: {
      ...data,
      isSynced: false,
    },
    select,
  });

  return NextResponse.json(updatedResource, { status: 200 });
}

export async function deleteSyncedResource({
  body,
  model,
  resourceName,
  id,
  locationId,
}: {
  body: Record<string, unknown>;
  model: SyncPrismaModel;
  resourceName: LocationResourceName;
  id: string;
  locationId: string;
}): Promise<NextResponse> {
  const syncModel = model as unknown as SyncModel;

  if (typeof body.deleteAllSynced !== "boolean") {
    return NextResponse.json(
      { error: "Delete synchronization option was not found" },
      { status: 400 },
    );
  }

  /*
   * We need the synchronization information before deciding
   * whether this delete affects one resource or the whole group.
   */
  const resource = await syncModel.findFirst({
    where: {
      id,
      locationId,
    },
    select: {
      id: true,
      syncGroupId: true,
    },
  });

  if (!resource) {
    return NextResponse.json(
      { error: `This ${resourceName} does not exist in our records` },
      { status: 400 },
    );
  }

  /*
   * If the user explicitly wants all synchronized resources deleted,
   * delete every currently-synced resource in the group plus the
   * selected resource itself.
   */
  if (resource.syncGroupId && body.deleteAllSynced === true) {
    await syncModel.deleteMany({
      where: {
        syncGroupId: resource.syncGroupId,

        // Must check if synced is ON and selecting itself as well since
        // the database record could've been false
        OR: [{ isSynced: true }, { id: resource.id }],
      },
    });

    return NextResponse.json(
      { message: `Synchronized ${resourceName}'s deleted successfully` },
      { status: 200 },
    );
  }

  /*
   * Otherwise only delete this location's resource.
   */
  await syncModel.delete({
    where: {
      id: resource.id,
      locationId,
    },
  });

  return NextResponse.json(
    { message: `${resourceName.toUpperCase()} deleted successfully` },
    { status: 200 },
  );
}

/*
 *   Checks the model's current order value and returns the incremented
 *   value of it. If there were no records for that model then automatically
 *   return 1.
 **/
export async function getNextOrder(
  model: OrderModel,
  where: Record<string, unknown>,
): Promise<NextResponse | number> {
  try {
    const lastRecord = await model.findFirst({
      where: where,
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    });

    return (lastRecord?.order ?? 0) + 1;
  } catch (error) {
    console.error("Failed to determine the next order:", error);
    return NextResponse.json(
      { error: "Failed to determine the next order" },
      { status: 500 },
    );
  }
}

/*
 *   Generates the slug from a given value string. It removes whitespace, converts
 *   everything to lowercase, removes everything except letters, numbers, spaces, and
 *   hyphens, converts one or more spaces into a single hyphen, and collapse multiple
 *   hyphens into one.
 *
 *   Example:
 *       Example Street -> example-street
 *       The #1 Store -> the-1-store
 *       Menu (Lunch) -> menu-lunch
 *       Rice & Beans -> rice-beans
 **/
export function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/*
 * Generates a domain-safe value from a given string.
 * It trims whitespace, converts everything to lowercase,
 * converts spaces into hyphens, collapses repeated hyphens,
 * and removes unsupported characters while preserving periods
 * so domain extensions and subdomains remain valid.
 *
 * Examples:
 *   My Business.com -> my-business.com
 *   Store  Name.net -> store-name.net
 *   Shop.Example.COM -> shop.example.com
 */
export function createDomainSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/[^a-z0-9.-]/g, "");
}

/*
 *   Normalizes string to DayOfWeek string value and returns value when its included
 *   in the DayOfWeek type.
 **/
export function normalizeDayOfWeek(value: string): DayOfWeek | null {
  const normalized =
    value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

  if (!Object.values(DayOfWeek).includes(normalized as DayOfWeek)) {
    return null;
  }

  return normalized as DayOfWeek;
}

/*
 *   Converts a string time to minutes by spliting the time formate, HH:MM, by the colon.
 *
 *   Example:
 *       12:00 -> 12 * 60 + 0 -> 720
 *       15:30 -> 15 * 60 + 30 -> 930
 *       23:59 -> 23 * 60 + 59 -> 1439
 **/
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

/*
 *   Checks if the new time provided is overlapping from the existing time. Uses timeToMinutes()
 *   helper function to calculate minutes. Uses calculated value to determine ranges of existing and
 *   newly provided times.
 *
 *   Example:
 *       (newOpen = 720, newClose = 900), (existingOpen = 780, existingClose = 960)
 *           -> returns False -> Reason: newClose overlaps with existingOpen time
 **/
export function checkTimeOverlap(
  newOpenTime: string,
  newCloseTime: string,
  existingOpenTime: string,
  existingCloseTime: string,
): boolean {
  const newOpen = timeToMinutes(newOpenTime);
  const newClose = timeToMinutes(newCloseTime);
  const existingOpen = timeToMinutes(existingOpenTime);
  const existingClose = timeToMinutes(existingCloseTime);

  return newOpen < existingClose && newClose > existingOpen;
}

/*
 *   Validates an images existence, size, and type.
 **/
export async function imageRequestValidation(request: Request): Promise<
  | NextResponse
  | {
      image: File;
      isSynced: boolean;
    }
> {
  try {
    const formData = await request.formData();

    const image = formData.get("image");
    const isSynced = formData.get("isSynced");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          error:
            'Missing image file. Please submit the file using the "image" form-data field',
        },
        { status: 400 },
      );
    }

    if (typeof isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    if (image.size === 0) {
      return NextResponse.json(
        { error: "The uploaded image is empty" },
        { status: 400 },
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "The image cannot be larger than 2 MB" },
        { status: 413 },
      );
    }

    if (!isSupportedImageContentType(image.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 415 },
      );
    }

    return {
      image,
      isSynced: isSynced === "true",
    };
  } catch (error) {
    console.error("Failed to parse the image form data:", error);

    return NextResponse.json(
      { error: "Failed to get form data from request" },
      { status: 400 },
    );
  }
}

export async function createBusinessApiKey({
  businessId,
  name,
}: {
  businessId: string;
  name: string;
}) {
  const { apiKey, keyHash, keyPrefix } = generateBusinessApiKey();

  const createdKey = await prisma.businessApiKey.create({
    data: {
      businessId,
      name,
      keyHash,
      keyPrefix,
    },
  });

  return {
    ...createdKey,
    apiKey,
  };
}

export function normalizeTime(time: string): string {
  const [hours, minutes] = time.split(":");

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}
