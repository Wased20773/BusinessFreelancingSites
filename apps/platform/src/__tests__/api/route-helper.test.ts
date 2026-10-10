/**
 * @jest-environment node
 */
import { createMockImage } from "../fixtures/image";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
import { Prisma } from "@business-freelancer/database";
import { consumeToken } from "@/lib/redis/tokenBucket";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  getSlug,
  createSlug,
  createDomainSlug,
  createSocialUrl,
  optionalString,
  isUniqueConstraintError,
  getLocationResponse,
  validateBusinessLocationParams,
  verifyLocationInBusiness,
  createSyncedResource,
  updateSyncedResource,
  deleteSyncedResource,
  imageRequestValidation,
  normalizeDayOfWeek,
  isValidTime,
  normalizeTime,
  timeToMinutes,
  checkTimeOverlap,
  getNextOrder,
  rateLimiterRead,
} from "@/app/api/route_helper";

const mockedConsumeToken = jest.mocked(consumeToken);

beforeEach(() => {
  jest.resetAllMocks();
  resetPrismaMock();
});

async function expectResponse(
  result: unknown,
): Promise<{ status: number; body: unknown }> {
  expect(result).toBeInstanceOf(Response);

  if (!(result instanceof Response)) {
    throw new Error("Expected a Response");
  }

  return { status: result.status, body: await result.json() };
}

function createImageFormRequest(fields: Record<string, string | File>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return new Request("http://localhost/api/test", {
    method: "POST",
    body: formData,
  });
}

describe("getSlug", () => {
  it("returns the business slug from the request query parameters", () => {
    const request = new Request(
      "http://localhost/api/business?slug=tacos-el-guero",
    );

    expect(getSlug(request)).toBe("tacos-el-guero");
  });

  it("throws when the business slug is missing", () => {
    const request = new Request("http://localhost/api/business");

    expect(() => getSlug(request)).toThrow("Missing business slug");
  });
});

describe("getNextOrder", () => {
  it("returns 1 when no existing records are found", async () => {
    const model = {
      findFirst: jest.fn().mockResolvedValue(null),
    };

    const result = await getNextOrder(model, { locationId: "location-123" });

    expect(result).toBe(1);

    expect(model.findFirst).toHaveBeenCalledWith({
      where: {
        locationId: "location-123",
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    });
  });

  it("returns the next order value after the highest existing order", async () => {
    const model = {
      findFirst: jest.fn().mockResolvedValue({ order: 4 }),
    };

    const result = await getNextOrder(model, { itemId: "item-123" });

    expect(result).toBe(5);
  });

  it("returns 500 when determining the next order fails", async () => {
    const model = {
      findFirst: jest.fn().mockRejectedValue(new Error("Database query failed")),
    };

    const { status, body } = await expectResponse(
      await getNextOrder(model, { locationId: "location-123" }),
    );

    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to determine the next order" });
  });
});

describe("createSlug", () => {
  it.each([
    ["Tacos El Guero", "tacos-el-guero"],
    ["  Tacos   El   Guero  ", "tacos-el-guero"],
    ["Tacos---El---Guero", "tacos-el-guero"],
    ["Tacos & Burritos!", "tacos-burritos"],
    ["123 Main Street", "123-main-street"],
    ["TACOS", "tacos"],
    ["", ""],
  ])('converts "%s" into "%s"', (input, expected) => {
    expect(createSlug(input)).toBe(expected);
  });
});

describe("createDomainSlug", () => {
  it.each([
    ["My Business.com", "my-business.com"],
    ["Store  Name.net", "store-name.net"],
    ["Shop.Example.COM", "shop.example.com"],
    ["tacos!@#.com", "tacos.com"],
  ])('converts "%s" into "%s"', (input, expected) => {
    expect(createDomainSlug(input)).toBe(expected);
  });
});

describe("createSocialUrl", () => {
  it.each([
    ["instagram.com", "tacos.el_guero", "https://instagram.com/tacos.el_guero"],
    ["tiktok.com", "@TacosElGuero", "https://tiktok.com/@TacosElGuero"],
    ["facebook.com", "  Tacos El Guero  ", "https://facebook.com/TacosElGuero"],
    ["x.com", "tacos/../admin?", "https://x.com/tacos..admin"],
  ])('builds the URL for %s + "%s"', (domain, profileName, expected) => {
    expect(createSocialUrl(domain, profileName)).toBe(expected);
  });
});

describe("optionalString", () => {
  it.each([
    ["  Portland  ", "Portland"],
    ["", null],
    ["   ", null],
    [null, null],
    [undefined, null],
    [42, null],
  ])("converts %p into %p", (input, expected) => {
    expect(optionalString(input)).toBe(expected);
  });
});

describe("isUniqueConstraintError", () => {
  it("returns true for a Prisma P2002 error", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique failed", {
      code: "P2002",
      clientVersion: "test",
    });

    expect(isUniqueConstraintError(error)).toBe(true);
  });

  it("returns false for other Prisma errors and generic errors", () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError(
      "Foreign key failed",
      { code: "P2003", clientVersion: "test" },
    );

    expect(isUniqueConstraintError(foreignKeyError)).toBe(false);
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false);
  });
});

describe("getLocationResponse", () => {
  const select = { id: true, contacts: true } as const;

  it("returns a resource-specific 404 when the location is not found", async () => {
    mockPrisma.location.findFirst.mockResolvedValue(null);

    const response = await getLocationResponse(
      "business-123",
      "missing-location",
      select,
      "contact",
    );

    expect(response.status).toBe(404);

    expect(await response.json()).toEqual({
      error: "Location not found while fetching contact data",
    });

    expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "missing-location",
        businessId: "business-123",
      },
      select,
    });
  });

  it("returns a resource-specific 500 when fetching the location fails", async () => {
    mockPrisma.location.findFirst.mockRejectedValue(
      new Error("Database query failed"),
    );

    const response = await getLocationResponse(
      "business-123",
      "location-123",
      select,
      "menu",
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch menu data" });
  });

  it("successfully returns the selected location data", async () => {
    const location = { id: "location-123", contacts: [] };

    mockPrisma.location.findFirst.mockResolvedValue(location);

    const response = await getLocationResponse(
      "business-123",
      "location-123",
      select,
      "contact",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(location);
  });
});

describe("validateBusinessLocationParams", () => {
  it("returns 400 when businessId is missing", async () => {
    const { status, body } = await expectResponse(
      validateBusinessLocationParams("", "location-123"),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Missing businessId" });
  });

  it("returns 400 when locationId is missing", async () => {
    const { status, body } = await expectResponse(
      validateBusinessLocationParams("business-123", ""),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Missing locationId" });
  });

  it("returns null when both params are present", () => {
    expect(
      validateBusinessLocationParams("business-123", "location-123"),
    ).toBeNull();
  });
});

describe("verifyLocationInBusiness", () => {
  it("returns 404 when the location does not belong to the business", async () => {
    mockPrisma.location.findFirst.mockResolvedValue(null);

    const { status, body } = await expectResponse(
      await verifyLocationInBusiness("business-123", "other-location"),
    );

    expect(status).toBe(404);
    expect(body).toEqual({
      error: "This location does not exist in our records",
    });

    expect(mockPrisma.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-location",
        businessId: "business-123",
      },
      select: {
        id: true,
      },
    });
  });

  it("returns null when the location belongs to the business", async () => {
    mockPrisma.location.findFirst.mockResolvedValue({ id: "location-123" });

    expect(
      await verifyLocationInBusiness("business-123", "location-123"),
    ).toBeNull();
  });
});

describe("createSyncedResource", () => {
  const data = { phoneNumber: "503-555-1234" };
  const select = { id: true, phoneNumber: true };

  it("returns 400 when the synchronization setting is missing", async () => {
    const response = await createSyncedResource({
      body: {},
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      locationId: "location-123",
      data,
      select,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });

    expect(mockPrisma.contact.create).not.toHaveBeenCalled();
    expect(mockPrisma.contact.createMany).not.toHaveBeenCalled();
  });

  it("creates the resource only in the selected location when not synced", async () => {
    const created = { id: "contact-123", phoneNumber: "503-555-1234" };

    mockPrisma.contact.create.mockResolvedValue(created);

    const response = await createSyncedResource({
      body: { isSynced: false },
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      locationId: "location-123",
      data,
      select,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);

    expect(mockPrisma.contact.create).toHaveBeenCalledWith({
      data: {
        ...data,
        locationId: "location-123",
        syncGroupId: null,
        isSynced: false,
      },
      select,
    });

    expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 when synced but the business has no locations", async () => {
    mockPrisma.location.findMany.mockResolvedValue([]);

    const response = await createSyncedResource({
      body: { isSynced: true },
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      locationId: "location-123",
      data,
      select,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "No locations were found for this business",
    });

    expect(mockPrisma.contact.createMany).not.toHaveBeenCalled();
  });

  it("creates the resource in every location with one shared syncGroupId when synced", async () => {
    jest.spyOn(crypto, "randomUUID").mockReturnValue(
      "sync-group-123" as `${string}-${string}-${string}-${string}-${string}`,
    );

    mockPrisma.location.findMany.mockResolvedValue([
      { id: "location-123" },
      { id: "location-456" },
    ]);

    mockPrisma.contact.createMany.mockResolvedValue({ count: 2 });

    const response = await createSyncedResource({
      body: { isSynced: true },
      model: mockPrisma.contact as never,
      resourceName: "contact",
      businessId: "business-123",
      locationId: "location-123",
      data,
      select,
    });

    expect(response.status).toBe(201);

    expect(await response.json()).toEqual({
      message: "Synchronized contact's created successfully",
      count: 2,
      syncGroupId: "sync-group-123",
    });

    expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
      where: { businessId: "business-123" },
      select: { id: true },
    });

    expect(mockPrisma.contact.createMany).toHaveBeenCalledWith({
      data: [
        {
          ...data,
          locationId: "location-123",
          syncGroupId: "sync-group-123",
          isSynced: true,
        },
        {
          ...data,
          locationId: "location-456",
          syncGroupId: "sync-group-123",
          isSynced: true,
        },
      ],
    });
  });
});

describe("updateSyncedResource", () => {
  const data = { phoneNumber: "503-555-9876" };
  const select = { id: true, phoneNumber: true, syncGroupId: true };

  function update(body: Record<string, unknown>) {
    return updateSyncedResource({
      body,
      model: mockPrisma.contact as never,
      resourceName: "contact",
      id: "contact-123",
      locationId: "location-123",
      data,
      select,
    });
  }

  it("returns 400 when the synchronization setting is missing", async () => {
    const response = await update({});

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Synchronization setting was not found",
    });

    expect(mockPrisma.contact.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the resource is not in the selected location", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);

    const response = await update({ isSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "This contact does not exist in our records",
    });

    expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
      where: { id: "contact-123", locationId: "location-123" },
      select,
    });
  });

  it("updates only this resource and un-syncs it when isSynced is false", async () => {
    const updated = {
      id: "contact-123",
      phoneNumber: "503-555-9876",
      syncGroupId: "sync-group-123",
    };

    mockPrisma.contact.findFirst.mockResolvedValue({
      id: "contact-123",
      syncGroupId: "sync-group-123",
    });

    mockPrisma.contact.update.mockResolvedValue(updated);

    const response = await update({ isSynced: false });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updated);

    expect(mockPrisma.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-123", locationId: "location-123" },
      data: { ...data, isSynced: false },
      select,
    });

    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
  });

  it("updates only this resource when it has no sync group, even if isSynced is true", async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({
      id: "contact-123",
      syncGroupId: null,
    });

    mockPrisma.contact.update.mockResolvedValue({ id: "contact-123" });

    const response = await update({ isSynced: true });

    expect(response.status).toBe(200);
    expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.contact.update).toHaveBeenCalled();
  });

  it("updates every synced resource in the group plus itself when isSynced is true", async () => {
    const updated = {
      id: "contact-123",
      phoneNumber: "503-555-9876",
      syncGroupId: "sync-group-123",
    };

    mockPrisma.contact.findFirst
      .mockResolvedValueOnce({ id: "contact-123", syncGroupId: "sync-group-123" })
      .mockResolvedValueOnce(updated);

    mockPrisma.contact.updateMany.mockResolvedValue({ count: 3 });

    const response = await update({ isSynced: true });

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      message: "Synchronized contact's updated successfully",
      ...updated,
    });

    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
      where: {
        syncGroupId: "sync-group-123",
        OR: [{ isSynced: true }, { id: "contact-123" }],
      },
      data: { ...data, isSynced: true },
    });

    expect(mockPrisma.contact.update).not.toHaveBeenCalled();
  });
});

describe("deleteSyncedResource", () => {
  function remove(body: Record<string, unknown>) {
    return deleteSyncedResource({
      body,
      model: mockPrisma.social as never,
      resourceName: "social",
      id: "social-123",
      locationId: "location-123",
    });
  }

  it("returns 400 when the delete synchronization option is missing", async () => {
    const response = await remove({});

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Delete synchronization option was not found",
    });

    expect(mockPrisma.social.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the resource is not in the selected location", async () => {
    mockPrisma.social.findFirst.mockResolvedValue(null);

    const response = await remove({ deleteAllSynced: false });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "This social does not exist in our records",
    });

    expect(mockPrisma.social.delete).not.toHaveBeenCalled();
  });

  it("deletes only this resource when deleteAllSynced is false", async () => {
    mockPrisma.social.findFirst.mockResolvedValue({
      id: "social-123",
      syncGroupId: "sync-group-123",
    });

    const response = await remove({ deleteAllSynced: false });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "SOCIAL deleted successfully",
    });

    expect(mockPrisma.social.delete).toHaveBeenCalledWith({
      where: { id: "social-123", locationId: "location-123" },
    });

    expect(mockPrisma.social.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes every synced resource in the group plus itself when deleteAllSynced is true", async () => {
    mockPrisma.social.findFirst.mockResolvedValue({
      id: "social-123",
      syncGroupId: "sync-group-123",
    });

    const response = await remove({ deleteAllSynced: true });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Synchronized social's deleted successfully",
    });

    expect(mockPrisma.social.deleteMany).toHaveBeenCalledWith({
      where: {
        syncGroupId: "sync-group-123",
        OR: [{ isSynced: true }, { id: "social-123" }],
      },
    });

    expect(mockPrisma.social.delete).not.toHaveBeenCalled();
  });

  it("deletes only this resource when it has no sync group", async () => {
    mockPrisma.social.findFirst.mockResolvedValue({
      id: "social-123",
      syncGroupId: null,
    });

    const response = await remove({ deleteAllSynced: true });

    expect(response.status).toBe(200);
    expect(mockPrisma.social.delete).toHaveBeenCalled();
    expect(mockPrisma.social.deleteMany).not.toHaveBeenCalled();
  });
});

describe("imageRequestValidation", () => {
  it("returns 400 when the request body cannot be parsed as form data", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "not-form-data" }),
    });

    const { status, body } = await expectResponse(
      await imageRequestValidation(request),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Failed to get form data from request" });
  });

  it('returns 400 when the "image" form-data field is not a file', async () => {
    const { status, body } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({ image: "not-a-file", isSynced: "false" }),
      ),
    );

    expect(status).toBe(400);
    expect(body).toEqual({
      error:
        'Missing image file. Please submit the file using the "image" form-data field',
    });
  });

  it('returns 400 when the "image" form-data field is missing', async () => {
    const { status } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({ isSynced: "false" }),
      ),
    );

    expect(status).toBe(400);
  });

  it("returns 400 when the synchronization setting is missing", async () => {
    const { status, body } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({ image: createMockImage() }),
      ),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "Synchronization setting was not found" });
  });

  it("does not require the synchronization setting when requireSyncSetting is false", async () => {
    const image = createMockImage();

    const result = await imageRequestValidation(
      createImageFormRequest({ image }),
      false,
    );

    expect(result).toEqual({ image: expect.any(File), isSynced: false });
  });

  it("returns 400 when the uploaded image is empty", async () => {
    const { status, body } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({
          image: new File([], "empty.png", { type: "image/png" }),
          isSynced: "false",
        }),
      ),
    );

    expect(status).toBe(400);
    expect(body).toEqual({ error: "The uploaded image is empty" });
  });

  it("returns 413 when the image exceeds 10 MB", async () => {
    const { status, body } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({
          image: createMockImage({ size: 10 * 1024 * 1024 + 1 }),
          isSynced: "false",
        }),
      ),
    );

    expect(status).toBe(413);
    expect(body).toEqual({ error: "The image cannot be larger than 10 MB" });
  });

  it("returns 415 when the image type is not supported", async () => {
    const { status, body } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({
          image: createMockImage({ type: "image/gif" }),
          isSynced: "false",
        }),
      ),
    );

    expect(status).toBe(415);
    expect(body).toEqual({
      error:
        "Unsupported image type. Only JPEG, PNG, and WebP images are allowed.",
    });
  });

  it("accepts an image that is exactly 10 MB", async () => {
    const result = await imageRequestValidation(
      createImageFormRequest({
        image: createMockImage({ size: 10 * 1024 * 1024 }),
        isSynced: "true",
      }),
    );

    expect(result).not.toBeInstanceOf(Response);

    if (result instanceof Response) {
      throw new Error("Expected a validated image");
    }

    expect(result.image.size).toBe(10 * 1024 * 1024);
    expect(result.isSynced).toBe(true);
  });

  it.each([
    ["image/jpeg", "taco.jpg"],
    ["image/png", "taco.png"],
    ["image/webp", "taco.webp"],
  ])("accepts %s images", async (type, name) => {
    const result = await imageRequestValidation(
      createImageFormRequest({
        image: createMockImage({ type, name }),
        isSynced: "false",
      }),
    );

    if (result instanceof Response) {
      throw new Error("Expected a validated image");
    }

    expect(result.image.name).toBe(name);
    expect(result.image.type).toBe(type);
    expect(result.isSynced).toBe(false);
  });

  it("accepts a supported MIME type even when the filename extension does not match", async () => {
    const result = await imageRequestValidation(
      createImageFormRequest({
        image: createMockImage({ name: "taco.png", type: "image/jpeg" }),
        isSynced: "false",
      }),
    );

    if (result instanceof Response) {
      throw new Error("Expected a validated image");
    }

    expect(result.image.name).toBe("taco.png");
    expect(result.image.type).toBe("image/jpeg");
  });

  it("returns 415 for a generic binary file type", async () => {
    const { status } = await expectResponse(
      await imageRequestValidation(
        createImageFormRequest({
          image: createMockImage({
            name: "upload.bin",
            type: "application/octet-stream",
          }),
          isSynced: "false",
        }),
      ),
    );

    expect(status).toBe(415);
  });
});

describe("normalizeDayOfWeek", () => {
  it.each([
    ["monday", "Monday"],
    ["MONDAY", "Monday"],
    ["Monday", "Monday"],
    ["tUeSdAy", "Tuesday"],
    ["wednesday", "Wednesday"],
    ["THURSDAY", "Thursday"],
    ["friday", "Friday"],
    ["SATURDAY", "Saturday"],
    ["sunday", "Sunday"],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalizeDayOfWeek(input)).toBe(expected);
  });

  it.each(["", "mon", "weekday", "holiday", "123", "monday ", " monday"])(
    'returns null for "%s"',
    (input) => {
      expect(normalizeDayOfWeek(input)).toBeNull();
    },
  );

  it.each([null, undefined, 1, {}])("returns null for non-string %p", (input) => {
    expect(normalizeDayOfWeek(input)).toBeNull();
  });
});

describe("isValidTime", () => {
  it.each(["00:00", "9:00", "09:30", "12:00", "23:59", " 17:45 "])(
    'accepts "%s"',
    (time) => {
      expect(isValidTime(time)).toBe(true);
    },
  );

  it.each(["24:00", "12:60", "noon", "12", "12:5", "", null, undefined, 1200])(
    "rejects %p",
    (time) => {
      expect(isValidTime(time)).toBe(false);
    },
  );
});

describe("normalizeTime", () => {
  it.each([
    ["9:00", "09:00"],
    ["09:05", "09:05"],
    [" 7:30 ", "07:30"],
    ["23:59", "23:59"],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalizeTime(input)).toBe(expected);
  });
});

describe("timeToMinutes", () => {
  it.each([
    ["00:00", 0],
    ["00:30", 30],
    ["01:00", 60],
    ["09:30", 570],
    ["12:00", 720],
    ["17:45", 1065],
    ["23:59", 1439],
  ])('converts "%s" to %i minutes', (time, expected) => {
    expect(timeToMinutes(time)).toBe(expected);
  });
});

describe("checkTimeOverlap", () => {
  it.each([
    ["09:00", "12:00", "11:00", "14:00"],
    ["11:00", "14:00", "09:00", "12:00"],
    ["09:00", "15:00", "10:00", "12:00"],
    ["10:00", "12:00", "09:00", "15:00"],
    ["09:00", "12:00", "09:00", "12:00"],
  ])(
    "returns true when %s-%s overlaps %s-%s",
    (newOpenTime, newCloseTime, existingOpenTime, existingCloseTime) => {
      expect(
        checkTimeOverlap(
          newOpenTime,
          newCloseTime,
          existingOpenTime,
          existingCloseTime,
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["09:00", "12:00", "12:00", "15:00"],
    ["12:00", "15:00", "09:00", "12:00"],
    ["09:00", "11:00", "12:00", "15:00"],
    ["16:00", "18:00", "09:00", "12:00"],
  ])(
    "returns false when %s-%s does not overlap %s-%s",
    (newOpenTime, newCloseTime, existingOpenTime, existingCloseTime) => {
      expect(
        checkTimeOverlap(
          newOpenTime,
          newCloseTime,
          existingOpenTime,
          existingCloseTime,
        ),
      ).toBe(false);
    },
  );
});

describe("rateLimiterRead", () => {
  it("does not rate limit dashboard session requests", async () => {
    const result = await rateLimiterRead({
      businessId: "business-123",
      authenticationType: "session",
      userId: "user-123",
    });

    expect(result).toBeUndefined();
    expect(mockedConsumeToken).not.toHaveBeenCalled();
  });

  it("allows API-key requests while tokens remain", async () => {
    mockedConsumeToken.mockResolvedValue({
      allowed: true,
      remainingTokens: 149,
      retryAfterMs: 0,
    });

    const result = await rateLimiterRead({
      businessId: "business-123",
      authenticationType: "apiKey",
    });

    expect(result).toBeUndefined();

    expect(mockedConsumeToken).toHaveBeenCalledWith({
      key: "rate:user:business-123:read",
      capacity: 150,
      tokensPerMinute: 60,
    });
  });

  it("returns 429 when an API-key request runs out of tokens", async () => {
    mockedConsumeToken.mockResolvedValue({
      allowed: false,
      remainingTokens: 0,
      retryAfterMs: 1000,
    });

    const { status, body } = await expectResponse(
      await rateLimiterRead({
        businessId: "business-123",
        authenticationType: "apiKey",
      }),
    );

    expect(status).toBe(429);
    expect(body).toEqual({ error: "Too many requests.", retryAfterMs: 1000 });
  });
});
