/**
 * @jest-environment node
 */

import {
  BUSINESS_ID,
  USER_ID,
  mockFailedAuthentication,
  mockSuccessfulAuthentication,
} from "@/__tests__/helpers/auth";
import { createJsonRequest } from "@/__tests__/helpers/request";
import { createRouteContext } from "@/__tests__/helpers/route";
import { mockPrisma, resetPrismaMock } from "@/__tests__/mocks/prisma";

import { GET, POST } from "@/app/api/businesses/[businessId]/users/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/businesses/[businessId]/users/[businessUserId]/route";
import { GET as SEARCH } from "@/app/api/businesses/[businessId]/users/search/route";

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/auth/authenticateBusinessAccess", () => ({
  authenticateBusinessAccess: jest.fn(),
}));

const BASE_URL = `http://localhost/api/businesses/${BUSINESS_ID}/users`;

const businessContext = createRouteContext({ businessId: BUSINESS_ID });

const memberContext = createRouteContext({
  businessId: BUSINESS_ID,
  businessUserId: "business-user-456",
});

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

const roleSelect = {
  select: { id: true, accessLevel: true, description: true },
};

const businessUserSelect = {
  id: true,
  businessId: true,
  userId: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSelect },
  role: roleSelect,
};

const businessUser = {
  id: "business-user-456",
  businessId: BUSINESS_ID,
  userId: "user-456",
  roleId: "role-staff",
  user: { id: "user-456", name: "John", email: "john@example.com" },
  role: { id: "role-staff", accessLevel: "staff", description: "View only" },
};

describe("/api/businesses/[businessId]/users", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    resetPrismaMock();
  });

  describe("GET", () => {
    function getUsers(query = "") {
      return GET(
        createJsonRequest({ url: `${BASE_URL}${query}`, method: "GET" }),
        businessContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await getUsers();

      expect(response.status).toBe(401);
      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it("returns 400 when requesting your own business user record", async () => {
      mockSuccessfulAuthentication();

      const response = await getUsers(`?userId=${USER_ID}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "You cannot request your own business user record here.",
      });

      expect(mockPrisma.businessUser.findMany).not.toHaveBeenCalled();
    });

    it("returns 500 when fetching the business users fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findMany.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await getUsers();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to fetch business users",
      });
    });

    it("returns an empty array when the business has no other users", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findMany.mockResolvedValue([]);

      const response = await getUsers();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
    });

    it("successfully returns every other business user, excluding the requester", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findMany.mockResolvedValue([businessUser]);

      const response = await getUsers();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([businessUser]);

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith({
        where: { businessId: BUSINESS_ID, userId: { not: USER_ID } },
        orderBy: { user: { email: "asc" } },
        select: businessUserSelect,
      });
    });

    it("returns only the requested user when userId is provided", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findMany.mockResolvedValue([businessUser]);

      await getUsers("?userId=user-456");

      expect(mockPrisma.businessUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: BUSINESS_ID, userId: "user-456" },
        }),
      );
    });
  });

  describe("POST", () => {
    function postUser(body: unknown) {
      return POST(
        createJsonRequest({ url: BASE_URL, method: "POST", body }),
        businessContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await postUser({
        email: "john@example.com",
        accessLevel: "admin",
      });

      expect(response.status).toBe(401);
      expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
    });

    it.each([
      [{ accessLevel: "admin" }, "Missing email"],
      [{ email: "john@example.com" }, "Missing access level"],
      [
        { email: "john@example.com", accessLevel: "superuser" },
        "Selected access level does not exist",
      ],
    ])("returns 400 for %p", async (body, error) => {
      mockSuccessfulAuthentication();

      const response = await postUser(body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error });

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns 403 when trying to add a user as an owner", async () => {
      mockSuccessfulAuthentication();

      const response = await postUser({
        email: "john@example.com",
        accessLevel: "owner",
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error:
          "A user cannot be added as an owner. Add them first, then transfer ownership",
      });

      expect(mockPrisma.businessUser.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the selected user is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await postUser({
        email: " john@example.com ",
        accessLevel: "admin",
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "A selected user could not be found",
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
        select: { id: true },
      });
    });

    it("returns 400 when the user already belongs to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-456" });
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        id: "business-user-456",
      });

      const response = await postUser({
        email: "john@example.com",
        accessLevel: "admin",
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This user is already attached to this business",
      });
    });

    it("returns 500 when linking the user to the business fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-456" });
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-admin" });
      mockPrisma.businessUser.create.mockRejectedValue(
        new Error("Database create failed"),
      );

      const response = await postUser({
        email: "john@example.com",
        accessLevel: "admin",
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to link user to business",
      });
    });

    it("successfully links the user to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-456" });
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue({ id: "role-admin" });
      mockPrisma.businessUser.create.mockResolvedValue(businessUser);

      const response = await postUser({
        email: "john@example.com",
        accessLevel: "admin",
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(businessUser);

      expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
        where: { accessLevel: "admin" },
        select: { id: true },
      });

      expect(mockPrisma.businessUser.create).toHaveBeenCalledWith({
        data: {
          businessId: BUSINESS_ID,
          userId: "user-456",
          roleId: "role-admin",
        },
        select: businessUserSelect,
      });
    });
  });

  describe("PATCH /[businessUserId]", () => {
    function patchUser(body: unknown) {
      return PATCH(
        createJsonRequest({
          url: `${BASE_URL}/business-user-456`,
          method: "PATCH",
          body,
        }),
        memberContext,
      );
    }

    function targetMember(accessLevel = "staff", userId = "user-456") {
      return {
        id: "business-user-456",
        userId,
        role: { accessLevel },
      };
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await patchUser({ accessLevel: "admin" });

      expect(response.status).toBe(401);
      expect(mockPrisma.businessUser.update).not.toHaveBeenCalled();
    });

    it("returns 400 when the access level is missing", async () => {
      mockSuccessfulAuthentication();

      const response = await patchUser({});

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing access level" });
    });

    it("returns 400 when the selected access level is invalid", async () => {
      mockSuccessfulAuthentication();

      const response = await patchUser({ accessLevel: "superuser" });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Selected access level does not exist",
      });
    });

    it("returns 404 when the business user is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);

      const response = await patchUser({ accessLevel: "admin" });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This business user does not exist in our records",
      });

      expect(mockPrisma.businessUser.findFirst).toHaveBeenCalledWith({
        where: { id: "business-user-456", businessId: BUSINESS_ID },
        select: {
          id: true,
          userId: true,
          role: { select: { accessLevel: true } },
        },
      });
    });

    it("returns 403 when changing your own access level", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(
        targetMember("owner", USER_ID),
      );

      const response = await patchUser({ accessLevel: "admin" });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "You cannot change your own access level.",
      });
    });

    it("returns 403 when an admin tries to modify the owner", async () => {
      mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "admin");
      mockPrisma.businessUser.findFirst.mockResolvedValue(targetMember("owner"));

      const response = await patchUser({ accessLevel: "staff" });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Administrators cannot modify the business owner.",
      });
    });

    it("returns 403 when an admin tries to transfer ownership", async () => {
      mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "admin");
      mockPrisma.businessUser.findFirst.mockResolvedValue(targetMember("staff"));

      const response = await patchUser({ accessLevel: "owner" });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Only the business owner can transfer ownership.",
      });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("returns 500 when updating the business user fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(targetMember());
      mockPrisma.businessUser.update.mockRejectedValue(
        new Error("Database update failed"),
      );

      const response = await patchUser({ accessLevel: "admin" });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to update business user",
      });
    });

    it("successfully updates the business user's role", async () => {
      const updated = { ...businessUser, role: { accessLevel: "admin" } };

      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(targetMember());
      mockPrisma.businessUser.update.mockResolvedValue(updated);

      const response = await patchUser({ accessLevel: "admin" });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(updated);

      expect(mockPrisma.businessUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "business-user-456" },
          data: { role: { connect: { accessLevel: "admin" } } },
        }),
      );

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("transfers ownership by demoting the owner to admin and promoting the member", async () => {
      const promoted = { ...businessUser, role: { accessLevel: "owner" } };

      mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "owner");
      mockPrisma.businessUser.findFirst.mockResolvedValue(targetMember("admin"));
      mockPrisma.businessUser.update
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(promoted);

      const response = await patchUser({ accessLevel: "owner" });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(promoted);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      expect(mockPrisma.businessUser.update).toHaveBeenNthCalledWith(1, {
        where: {
          businessId_userId: { businessId: BUSINESS_ID, userId: USER_ID },
        },
        data: { role: { connect: { accessLevel: "admin" } } },
      });

      expect(mockPrisma.businessUser.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: "business-user-456" },
          data: { role: { connect: { accessLevel: "owner" } } },
        }),
      );
    });
  });

  describe("DELETE /[businessUserId]", () => {
    function deleteUser() {
      return DELETE(
        createJsonRequest({
          url: `${BASE_URL}/business-user-456`,
          method: "DELETE",
        }),
        memberContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await deleteUser();

      expect(response.status).toBe(401);
      expect(mockPrisma.businessUser.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when the business user is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue(null);

      const response = await deleteUser();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "This business user does not exist in our records",
      });
    });

    it("returns 403 when removing yourself", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        id: "business-user-456",
        userId: USER_ID,
        role: { accessLevel: "owner" },
      });

      const response = await deleteUser();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error:
          "You cannot remove yourself from the business through member management.",
      });

      expect(mockPrisma.businessUser.delete).not.toHaveBeenCalled();
    });

    it("returns 403 when an admin tries to remove the owner", async () => {
      mockSuccessfulAuthentication(BUSINESS_ID, USER_ID, "admin");
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        id: "business-user-456",
        userId: "user-456",
        role: { accessLevel: "owner" },
      });

      const response = await deleteUser();

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Administrators cannot remove the business owner.",
      });
    });

    it("returns 500 when deleting the business user fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        id: "business-user-456",
        userId: "user-456",
        role: { accessLevel: "staff" },
      });
      mockPrisma.businessUser.delete.mockRejectedValue(
        new Error("Database delete failed"),
      );

      const response = await deleteUser();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to delete business user",
      });
    });

    it("successfully deletes the business user", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.businessUser.findFirst.mockResolvedValue({
        id: "business-user-456",
        userId: "user-456",
        role: { accessLevel: "staff" },
      });

      const response = await deleteUser();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Business user deleted successfully",
      });

      expect(mockPrisma.businessUser.delete).toHaveBeenCalledWith({
        where: { id: "business-user-456" },
      });
    });
  });

  describe("GET /search", () => {
    function searchUser(query = "?email=john@example.com") {
      return SEARCH(
        createJsonRequest({ url: `${BASE_URL}/search${query}`, method: "GET" }),
        businessContext,
      );
    }

    it("returns the authentication error response", async () => {
      mockFailedAuthentication();

      const response = await searchUser();

      expect(response.status).toBe(401);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 when the email query parameter is missing", async () => {
      mockSuccessfulAuthentication();

      const response = await searchUser("");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Missing email" });
    });

    it("returns 404 when the searched user is not found", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await searchUser();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: "Searched user was not found",
      });
    });

    it("returns 400 when the user already belongs to the business", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-456",
        email: "john@example.com",
        businesses: [{ id: "business-user-456" }],
      });

      const response = await searchUser();

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "This user is already attached to this business",
      });
    });

    it("returns 500 when searching for the account fails", async () => {
      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database query failed"),
      );

      const response = await searchUser();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: "Failed to search for account",
      });
    });

    it("successfully returns the searched user without the membership lookup", async () => {
      const user = {
        id: "user-456",
        name: "John",
        username: "john123",
        email: "john@example.com",
        emailVerified: null,
        image: null,
      };

      mockSuccessfulAuthentication();
      mockPrisma.user.findUnique.mockResolvedValue({ ...user, businesses: [] });

      const response = await searchUser();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(user);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          businesses: {
            where: { businessId: BUSINESS_ID },
            select: { id: true },
          },
        },
      });
    });
  });
});
