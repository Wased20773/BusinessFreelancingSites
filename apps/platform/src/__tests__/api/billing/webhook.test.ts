/**
 * @jest-environment node
 */
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/syncSubscription";

jest.mock("@/lib/billing/stripe", () => ({
  getStripe: jest.fn(),
}));

jest.mock("@/lib/billing/syncSubscription", () => ({
  syncSubscription: jest.fn(),
}));

import { POST } from "@/app/api/billing/webhook/route";

const mockConstructEvent = jest.fn();
const mockedSyncSubscription = jest.mocked(syncSubscription);

function postWebhook(signature: string | null = "t=1,v1=signature") {
  return POST(
    new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: signature ? { "stripe-signature": signature } : {},
      body: JSON.stringify({ id: "evt_123" }),
    }),
  );
}

beforeEach(() => {
  jest.resetAllMocks();

  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  jest.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  } as never);
});

describe("POST /api/billing/webhook", () => {
  it("returns 400 without a Stripe signature", async () => {
    const response = await postWebhook(null);

    expect(response.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when the signature is invalid", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const response = await postWebhook();

    expect(response.status).toBe(400);
    expect(mockedSyncSubscription).not.toHaveBeenCalled();
  });

  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ])("syncs the subscription on %s", async (type) => {
    mockConstructEvent.mockReturnValue({
      type,
      data: { object: { id: "sub_123" } },
    });

    const response = await postWebhook();

    expect(response.status).toBe(200);
    expect(mockedSyncSubscription).toHaveBeenCalledWith("sub_123");
  });

  it("acknowledges and ignores other events", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.paid",
      data: { object: { id: "in_123" } },
    });

    const response = await postWebhook();

    expect(response.status).toBe(200);
    expect(mockedSyncSubscription).not.toHaveBeenCalled();
  });

  it("returns 500 so Stripe retries when syncing fails", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123" } },
    });
    mockedSyncSubscription.mockRejectedValue(new Error("Database is down"));

    const response = await postWebhook();

    expect(response.status).toBe(500);
  });
});
