"use client";

import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import "../../page.css";
import Image from "next/image";
import EditIcon from "@/components/icons/edit.svg";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  ACCESS_LEVEL,
  type AccessLevel,
  type BusinessUserJson,
} from "@/types/types";
import type { SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import ExitIconBlack from "@/components/icons/exit-black.svg";
import { toast } from "sonner";
import RequiredField from "@/components/ui/RequiredField";
import {
  deleteUserFromBusiness,
  getBusinessUsers,
  updateUsersAccessLevel,
} from "@/lib/api/users";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import { useSession } from "next-auth/react";
import LoadingBar from "@/components/ui/LoadingBar";

export default function UserDetailsPage() {
  const params = useParams<{
    businessId: string;
    userId: string;
  }>();

  const businessId = params.businessId;
  const userId = params.userId;

  const [userData, setUserData] = useState<BusinessUserJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedAccessLevel, setSelectedAccessLevel] =
    useState<AccessLevel | null>(null);
  const [clickedDelete, setClickedDelete] = useState<boolean>(false);

  const [loadingDelete, setLoadingDelete] = useState<boolean>(false);
  const [deleteVerification, setDeleteVerification] = useState<string>("");

  const router = useRouter();

  const { data: session, status, update } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const isCurrentUser = session?.user?.id === userData?.user?.id;
  const targetIsOwner = userData?.role?.accessLevel === ACCESS_LEVEL.owner;

  const canManageMembers =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const canViewMemberDetails =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  /*
   * Nobody can modify themselves.
   *
   * Admins also cannot modify the owner.
   */
  const canModifySelectedUser =
    canManageMembers &&
    !isCurrentUser &&
    !(currentAccessLevel === ACCESS_LEVEL.admin && targetIsOwner);

  const canDeleteSelectedUser = canModifySelectedUser;

  /*
   * Only the current owner can transfer
   * ownership to another member.
   */
  const canTransferOwnership =
    currentAccessLevel === ACCESS_LEVEL.owner && !isCurrentUser;

  const isOwnershipTransfer =
    selectedAccessLevel === ACCESS_LEVEL.owner &&
    currentAccessLevel === ACCESS_LEVEL.owner;

  const accessLevelChanged =
    selectedAccessLevel !== userData?.role?.accessLevel;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userData || !selectedAccessLevel || !canModifySelectedUser) {
      return;
    }

    if (selectedAccessLevel === userData.role?.accessLevel) {
      setIsEdit(false);
      return;
    }

    const transferringOwnership =
      selectedAccessLevel === ACCESS_LEVEL.owner &&
      currentAccessLevel === ACCESS_LEVEL.owner;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateResponse = toast.promise<BusinessUserJson>(
        updateUsersAccessLevel(businessId, userData.id, selectedAccessLevel),
        {
          loading: transferringOwnership
            ? "Transferring ownership..."
            : "Updating access level...",

          success: (data) => {
            const accessLevel = data.role?.accessLevel;

            if (!accessLevel) {
              return {
                message: "Access level updated.",
                description: "Could not retrieve access level name.",
              };
            }

            if (accessLevel === ACCESS_LEVEL.owner) {
              return {
                message: "Ownership transferred.",
                description: `${
                  userData.user?.name ?? "This member"
                } is now the business owner.`,
              };
            }

            const formattedAccessLevel =
              accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1);

            return {
              message: `${formattedAccessLevel} access granted.`,
              description: `${
                userData.user?.name ?? "This member"
              } now has ${accessLevel} access.`,
            };
          },

          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
              return {
                message: "Failed to update access level.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating this member.",
            };
          },
        },
      );

      const updatedUser = await updateResponse.unwrap();

      setUserData((current) =>
        current
          ? {
              ...current,
              role: updatedUser.role,
              updatedAt: updatedUser.updatedAt,
            }
          : current,
      );

      setSelectedAccessLevel(updatedUser.role?.accessLevel ?? null);

      /*
       * Ownership transfer changes the
       * authenticated owner to admin.
       *
       * Refresh the Auth.js business context
       * immediately so the dashboard UI gets
       * the new access level.
       */
      if (transferringOwnership) {
        await update({
          businessId,
        });
      }

      setIsEdit(false);
    } catch (error) {
      console.error("Failed to update business user:", error);

      if (
        axios.isAxiosError<{
          error?: string;
        }>(error)
      ) {
        setErrorMessage(
          error.response?.data?.error ??
            "Failed to update the user's access level.",
        );
      } else {
        setErrorMessage("Failed to update the user's access level.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userData?.user?.email || !canDeleteSelectedUser) {
      return;
    }

    if (deleteVerification !== userData.user.email) {
      return;
    }

    setLoadingDelete(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise<{ message: string }>(
        deleteUserFromBusiness(businessId, userData.id),
        {
          loading: "Removing user...",
          success: (data) => data.message,

          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
              return {
                message: "Failed to remove user.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while removing this member.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(`/businesses/${businessId}/users`);

      setClickedDelete(false);
      setDeleteVerification("");
    } catch (error) {
      console.error("Failed to remove user from business:", error);

      if (
        axios.isAxiosError<{
          error?: string;
        }>(error)
      ) {
        setErrorMessage(
          error.response?.data?.error ??
            "Failed to remove the user from the business.",
        );
      } else {
        setErrorMessage("Failed to remove the user from the business.");
      }
    } finally {
      setLoadingDelete(false);
    }
  }

  useEffect(() => {
    async function getUserData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const userResponse = toast.promise<BusinessUserJson[]>(
          getBusinessUsers(businessId),
          {
            loading: "Loading user info...",
            success: "User information loaded.",

            error: (error) => {
              if (axios.isAxiosError(error)) {
                return {
                  message: "Failed to load user info.",
                  description: `Status code: ${
                    error.response?.status ?? "No response"
                  }`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the user information.",
              };
            },
          },
        );

        const data = await userResponse.unwrap();

        const selectedUser = data.find(
          (businessUser) => businessUser.user?.id === userId,
        );

        if (!selectedUser) {
          setUserData(null);
          setSelectedAccessLevel(null);
          setErrorMessage("User not found.");
          return;
        }

        setUserData(selectedUser);

        setSelectedAccessLevel(selectedUser.role?.accessLevel ?? null);
      } catch (error) {
        console.error("Error in User's page:", error);

        setUserData(null);
        setSelectedAccessLevel(null);

        if (
          axios.isAxiosError<{
            error?: string;
          }>(error)
        ) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business user data.",
          );
        } else {
          setErrorMessage("Failed to load business user data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewMemberDetails) {
      void getUserData();
    }
  }, []);

  if (status === "loading" || isLoading) {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  if (!canViewMemberDetails) {
    return (
      <section className="max-w-[1000px] mx-auto p-5">
        <h1 className="text-3xl font-semibold">Member unavailable</h1>

        <p className="text-gray-500 mt-1">
          Your current access level does not include access to member details.
        </p>
      </section>
    );
  }

  if (errorMessage && !userData) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!userData?.user?.email) {
    return <p className="p-5">User not found.</p>;
  }

  return (
    <section
      className="max-w-[1000px] mx-auto p-5"
      aria-labelledby="user-details-heading"
    >
      {/* Heading */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/businesses/${businessId}/users`}
          aria-label="Return to members"
          className="shrink-0"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={42} />
        </Link>

        <div className="min-w-0">
          <h1
            id="user-details-heading"
            className="text-3xl font-semibold truncate"
          >
            {userData.user?.name ?? "Member Details"}
          </h1>

          <p className="text-gray-500 mt-1">
            View account information and manage this member&apos;s access.
          </p>
        </div>
      </div>

      {/* Member Information */}
      <section className="border border-gray-300 rounded-xl p-5">
        {/* General */}
        <div>
          <h2 className="text-xl font-semibold">Member Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>

              <p className="font-medium mt-1">
                {userData.user?.name ?? "Missing name"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Email</p>

              <p className="font-medium mt-1 break-all">
                {userData.user?.email ?? "Missing email"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Username</p>

              <p className="font-medium mt-1">
                {userData.user?.username ?? "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Access Level</p>

              <span className="inline-flex mt-1 capitalize rounded-md border border-gray-300 bg-gray-100 px-2 py-1 text-sm font-medium">
                {userData.role?.accessLevel ?? "Missing role"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Permissions */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Permissions</h2>

              <p className="text-sm text-gray-500 mt-1">
                Control what this member can access within the business.
              </p>
            </div>

            {canModifySelectedUser && !isEdit && (
              <button
                type="button"
                aria-label="Edit user permissions"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEdit(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEdit && canModifySelectedUser ? (
            <form className="mt-4" onSubmit={handleSubmit}>
              <label className="font-semibold" htmlFor="user-access-level">
                Access Level <RequiredField />
              </label>

              <select
                id="user-access-level"
                className="block w-full mt-1 border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                name="access-level"
                value={selectedAccessLevel ?? ""}
                onChange={(event) =>
                  setSelectedAccessLevel(event.target.value as AccessLevel)
                }
                disabled={isSaving}
                required
              >
                <option value={ACCESS_LEVEL.developer}>Developer</option>
                <option value={ACCESS_LEVEL.admin}>Admin</option>
                <option value={ACCESS_LEVEL.staff}>Staff</option>
                {canTransferOwnership && (
                  <option value={ACCESS_LEVEL.owner}>Owner</option>
                )}
              </select>

              {isOwnershipTransfer && (
                <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3">
                  <p className="font-semibold text-amber-900">
                    Transfer Ownership
                  </p>

                  <p className="text-sm text-amber-800 mt-1">
                    This member will become the business owner and your access
                    level will change to Admin.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                  disabled={isSaving}
                  onClick={() => {
                    setSelectedAccessLevel(userData.role?.accessLevel ?? null);

                    setIsEdit(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  className="bg-emerald-300 border border-green-500 rounded-lg text-green-900 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSaving || !accessLevelChanged}
                >
                  {isSaving
                    ? isOwnershipTransfer
                      ? "Transferring..."
                      : "Saving..."
                    : isOwnershipTransfer
                      ? "Transfer Ownership"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Access</p>

              <span className="inline-flex mt-1 capitalize rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 font-medium">
                {userData.role?.accessLevel ?? "Missing role"}
              </span>

              {isCurrentUser && (
                <p className="text-sm text-gray-500 mt-3">
                  You cannot change your own access level through member
                  management.
                </p>
              )}

              {currentAccessLevel === ACCESS_LEVEL.admin && targetIsOwner && (
                <p className="text-sm text-gray-500 mt-3">
                  Only the business owner can manage ownership.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Timestamps */}
        <div>
          <h2 className="text-xl font-semibold">Activity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Account Created</p>

              <p className="mt-1">
                {userData.user?.createdAt
                  ? formatDateTime(userData.user.createdAt, "date")
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Account Updated</p>

              <p className="mt-1">
                {userData.user?.updatedAt
                  ? formatDateTime(userData.user.updatedAt, "date")
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Added to Business</p>

              <p className="mt-1">
                {userData.createdAt
                  ? formatDateTime(userData.createdAt, "date")
                  : "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Membership Updated</p>

              <p className="mt-1">
                {userData.updatedAt
                  ? formatDateTime(userData.updatedAt, "date")
                  : "Unavailable"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      {canDeleteSelectedUser && (
        <section className="border border-red-400 bg-red-50 rounded-xl p-5 mt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-red-700">
                Remove Member
              </h2>

              <p className="text-sm text-red-400 mt-1">
                Remove this member&apos;s access to the business and its
                content.
              </p>
            </div>

            <button
              className="shrink-0 border border-red-400 rounded-lg bg-red-100 text-red-700 font-medium px-4 py-2 hover:bg-red-200 transition-colors"
              type="button"
              onClick={() => setClickedDelete(true)}
            >
              Remove Member
            </button>
          </div>
        </section>
      )}

      {/* Delete Modal */}
      {clickedDelete && canDeleteSelectedUser && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 px-5">
          <div className="w-full max-w-[500px] bg-white border border-gray-300 rounded-xl p-5">
            <div className="flex justify-between items-start gap-5">
              <div>
                <h2 className="text-xl font-semibold">Remove Member?</h2>

                <p className="text-gray-500 mt-1">
                  This member will immediately lose access to this business.
                </p>
              </div>

              <button
                type="button"
                className="p-1"
                aria-label="Close remove member modal"
                disabled={loadingDelete}
                onClick={() => {
                  setClickedDelete(false);
                  setDeleteVerification("");
                }}
              >
                <Image src={ExitIconBlack} alt="" width={22} height={22} />
              </button>
            </div>

            <form
              className="mt-5"
              onSubmit={handleDelete}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            >
              <p className="text-sm text-gray-600">
                To confirm, type the member&apos;s email address:
              </p>

              <p className="font-semibold break-all mt-1">
                {userData.user.email}
              </p>

              <input
                type="text"
                id="remove-user"
                name="remove"
                value={deleteVerification}
                onChange={(event) => setDeleteVerification(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={loadingDelete}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 mt-3 disabled:opacity-50"
              />

              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  disabled={loadingDelete}
                  onClick={() => {
                    setClickedDelete(false);
                    setDeleteVerification("");
                  }}
                >
                  Cancel
                </button>

                <button
                  className="rounded-lg border border-red-400 bg-red-100 text-red-700 font-medium px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={
                    deleteVerification !== userData.user.email || loadingDelete
                  }
                >
                  {loadingDelete ? "Removing..." : "Remove Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4"
        >
          {errorMessage}
        </p>
      )}
    </section>
  );
}
