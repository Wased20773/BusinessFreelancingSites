/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  LOCATION_ID,
  mockLocationInBusiness,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";
// Must come after mocks/prisma: it loads getBusinessPlan, which needs mockPrisma.
import { mockBusinessPlan } from "@/__tests__/helpers/billing";
import { copyObject } from "@/lib/s3/copy";
import { deleteObject } from "@/lib/s3/delete";

import { PATCH } from "@/app/api/businesses/[businessId]/locations/[locationId]/items/[itemId]/route";

/*
 *   Editing a synced item on the Free plan. Synced items share one image in
 *   S3, so the edit must detach only this item and give it its own image copy;
 *   the shared image and the rest of the group stay untouched.
 **/

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

// jest.setup.ts fakes allowSync as "always allowed"; use the real one here.
jest.mock("@/lib/billing/sync", () => jest.requireActual("@/lib/billing/sync"));

jest.mock("@/lib/billing/getBusinessPlan", () => ({
  ...jest.requireActual("@/lib/billing/getBusinessPlan"),
  getBusinessPlan: jest.fn(),
}));

const mockedCopyObject = jest.mocked(copyObject);
const mockedDeleteObject = jest.mocked(deleteObject);

const URL = `http://localhost/api/businesses/${BUSINESS_ID}/locations/${LOCATION_ID}/items/item-123`;

const context = createRouteContext({
  businessId: BUSINESS_ID,
  locationId: LOCATION_ID,
  itemId: "item-123",
});

const PRIVATE_IMAGE = `businesses/${BUSINESS_ID}/items/image-item-123.webp`;
const PRIVATE_ORIGINAL = `businesses/${BUSINESS_ID}/items/original-item-123.png`;
const SHARED_IMAGE = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/image.webp`;
const SHARED_ORIGINAL = `businesses/${BUSINESS_ID}/items/synced/item-sync-group/original.png`;

const syncedItem = {
  id: "item-123",
  locationId: LOCATION_ID,
  syncGroupId: "item-sync-group",
  isSynced: true,
  imageKey: SHARED_IMAGE,
  originalImageKey: SHARED_ORIGINAL,
};

describe("PATCH items/[itemId] on the Free plan", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
    mockBusinessPlan("free");
  });

  it("detaches only this item, with its own image copy, even when sync is requested", async () => {
    mockSuccessfulAuthentication();
    mockLocationInBusiness();
    mockPrisma.item.findFirst
      .mockResolvedValueOnce(syncedItem) // the item being edited
      .mockResolvedValueOnce(null) // no slug conflict
      .mockResolvedValueOnce(syncedItem); // lookup inside updateSyncedResource
    mockPrisma.item.update.mockResolvedValue({ id: "item-123" });

    const response = await PATCH(
      createJsonRequest({
        url: URL,
        method: "PATCH",
        body: {
          name: "Al Pastor Taco",
          price: 3,
          isSynced: true,
        },
      }),
      context,
    );

    expect(response.status).toBe(200);

    // Never looks at or writes to the rest of the group.
    expect(mockPrisma.item.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.item.updateMany).not.toHaveBeenCalled();

    // Gets its own copy of the shared images...
    expect(mockedCopyObject).toHaveBeenCalledWith(SHARED_IMAGE, PRIVATE_IMAGE);
    expect(mockedCopyObject).toHaveBeenCalledWith(
      SHARED_ORIGINAL,
      PRIVATE_ORIGINAL,
    );

    // ...and only this item is updated, keeping its syncGroupId.
    expect(mockPrisma.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-123", locationId: LOCATION_ID },
        data: expect.objectContaining({
          imageKey: PRIVATE_IMAGE,
          originalImageKey: PRIVATE_ORIGINAL,
          isSynced: false,
        }),
      }),
    );
    expect(mockPrisma.item.update.mock.calls[0][0].data).not.toHaveProperty(
      "syncGroupId",
    );

    // The shared images are still used by the other locations.
    expect(mockedDeleteObject).not.toHaveBeenCalled();
  });
});
