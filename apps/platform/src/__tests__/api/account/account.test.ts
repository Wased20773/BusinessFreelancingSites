/**
 * @jest-environment node
 */

import type { Session } from "next-auth";

import { createJsonRequest } from "@/__tests__/helpers/request";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

import { GET, PATCH } from "@/app/api/account/route";

const mockedAuth = jest.fn<Promise<Session | null>, []>();

jest.mock("@/auth", () => ({
  auth: () => mockedAuth(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const URL = "http://localhost/api/account";

const session: Session = {
  user: { id: "user-123", name: "Tester", email: "tester@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
};

const accountSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

const account = {
  id: "user-123",
  name: "Tester",
  username: "tester123",
  email: "tester@example.com",
  image: null,
};

describe("/api/account", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("GET", () => {
    it("returns the authentication error response", async () => {
      mockedAuth.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized access" });

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when the account is not found", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "User account could not be found",
      });
    });

    it("returns 500 when fetching the account fails", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await GET();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to fetch account details",
      });
    });

    it("successfully returns the account details", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.findUnique.mockResolvedValue(account);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(account);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: accountSelect,
      });
    });
  });

  describe("PATCH", () => {
    function patchAccount(body: unknown) {
      return PATCH(createJsonRequest({ url: URL, method: "PATCH", body }));
    }

    it("returns the authentication error response", async () => {
      mockedAuth.mockResolvedValue(null);

      const response = await patchAccount({ username: "john123" });

      expect(response.status).toBe(401);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it.each([
      [{ name: "  " }, "Name is required"],
      [{ username: 42 }, "Username is required"],
      [{}, "No supported fields were provided"],
    ])("returns 400 for %p", async (body, error) => {
      mockedAuth.mockResolvedValue(session);

      const response = await patchAccount(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("returns 500 when updating the user profile fails", async () => {
      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.update.mockRejectedValue(new Error("Database update failed"));

      const response = await patchAccount({ username: "john123" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update user profile",
      });
    });

    it("successfully updates the user profile with trimmed values", async () => {
      const updated = { ...account, name: "John", username: "john123" };

      mockedAuth.mockResolvedValue(session);
      mockPrisma.user.update.mockResolvedValue(updated);

      const response = await patchAccount({
        name: " John ",
        username: " john123 ",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updated);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { name: "John", username: "john123" },
        select: accountSelect,
      });
    });
  });
});
