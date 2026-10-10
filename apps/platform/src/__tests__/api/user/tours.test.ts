/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

import { PATCH as PATCH_DASHBOARD_TOUR } from "@/app/api/user/dashboard-tour/route";
import { PATCH as PATCH_WORKSPACE_TOUR } from "@/app/api/user/workspace-tour/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe.each([
  {
    route: "/api/user/dashboard-tour",
    handler: PATCH_DASHBOARD_TOUR,
    field: "dashboardTourVersion",
  },
  {
    route: "/api/user/workspace-tour",
    handler: PATCH_WORKSPACE_TOUR,
    field: "workspaceTourVersion",
  },
])("PATCH $route", ({ handler, field }) => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  it("returns 401 when there is no session", async () => {
    mockedAuth.mockResolvedValue(null);

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("saves the current tour version on the user", async () => {
    mockedAuth.mockResolvedValue(session);
    mockPrisma.user.update.mockResolvedValue({});

    const response = await handler();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ [field]: 1 });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { [field]: 1 },
    });
  });
});
