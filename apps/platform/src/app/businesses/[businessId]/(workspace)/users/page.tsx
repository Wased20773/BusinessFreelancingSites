"use client";

import Image from "next/image";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import GoogleLogoIcon from "@/components/icons/google-logo.svg";
import "../page.css";
import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import Divider from "@/components/layout/Divider";
import KeyIcon from "@/components/icons/key.svg";
import SearchIcon from "@/components/icons/search.svg";
import { useEffect, useState } from "react";
import { type BusinessUserJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import ActionItem from "@/components/ui/ActionItem";
import { getBusinessUsers } from "@/lib/api/users";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

const USERS_PER_PAGE = 5;

export default function UsersPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [businessUserData, setBusinessUserData] = useState<BusinessUserJson[]>(
    [],
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleUsers, setVisibleUsers] = useState<number>(USERS_PER_PAGE);

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;
  const canManageMembers =
    currentAccessLevel === "owner" || currentAccessLevel === "admin";
  const canViewMembers = canManageMembers || currentAccessLevel === "staff";
  const isDeveloper = currentAccessLevel === "developer";

  useEffect(() => {
    async function getBusinessUserData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const usersToast = toast.promise<BusinessUserJson[]>(
          getBusinessUsers(businessId),
          {
            loading: "Loading business users...",
            success: "Users loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business users.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the business users.",
              };
            },
          },
        );

        const data: BusinessUserJson[] = await usersToast.unwrap();

        setBusinessUserData(data);
      } catch (error) {
        console.error("Error in Business User's page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
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

    if (status === "authenticated" && canViewMembers) {
      void getBusinessUserData();
    }
  }, [businessId, status, canViewMembers]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewMembers,
    pageTitle: "Members",
    reason: "Your current access level does not include members access.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="users-heading"
    >
      <div className="mb-6">
        <h1 id="users-heading" className="text-3xl font-semibold">
          Members
        </h1>

        <p className="mt-1 text-gray-500">
          {canManageMembers
            ? "Manage the people who have access to this business."
            : "View the people who have access to this business."}
        </p>
      </div>

      <div className="space-y-5">
        {canManageMembers && (
          <nav
            aria-label="Member actions"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <ActionItem
              href={`/businesses/${businessId}/users/access-level`}
              icon={KeyIcon}
              label="Access Levels"
              setIsLoading={setIsLoading}
            />

            <Divider />

            <ActionItem
              href={`/businesses/${businessId}/users/search`}
              icon={SearchIcon}
              label="Add Member"
              setIsLoading={setIsLoading}
            />
          </nav>
        )}

        <section
          aria-labelledby="business-members-heading"
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-300 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="business-members-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Business Members
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                {canManageMembers
                  ? "View and manage member access for this business."
                  : "View members and their assigned access levels."}
              </p>
            </div>

            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm tabular-nums text-gray-700">
              {businessUserData.length}{" "}
              {businessUserData.length === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {businessUserData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                <p className="font-semibold text-gray-900">No members found</p>

                <p className="mt-1 text-sm text-gray-600">
                  {canManageMembers
                    ? "Add a member by searching for their email address."
                    : "There are no other members attached to this business."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {businessUserData.slice(0, visibleUsers).map((businessUser) => {
                  const memberContent = (
                    <>
                      <Image
                        className="shrink-0 rounded-full border border-gray-300"
                        src={businessUser.user?.image || PlaceholderAccountIcon}
                        alt="Profile picture"
                        width={40}
                        height={40}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {businessUser.user?.name || "Missing name"}
                        </p>

                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <Image
                            src={GoogleLogoIcon}
                            alt="Google account provider"
                            width={14}
                            height={14}
                          />

                          <span className="truncate text-sm text-gray-600">
                            {businessUser.user?.email || "Missing email"}
                          </span>
                        </div>
                      </div>

                      <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                        {businessUser.role?.accessLevel || "Missing role"}
                      </span>
                    </>
                  );

                  if (canManageMembers) {
                    return (
                      <Link
                        key={businessUser.id}
                        href={`/businesses/${businessId}/users/${
                          businessUser.user?.id || "not-found"
                        }`}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-50"
                        onClick={() => setIsLoading(true)}
                      >
                        {memberContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={businessUser.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                    >
                      {memberContent}
                    </div>
                  );
                })}

                {visibleUsers < businessUserData.length && (
                  <button
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    type="button"
                    onClick={() =>
                      setVisibleUsers((current) => current + USERS_PER_PAGE)
                    }
                  >
                    <span>Load More</span>
                    <ArrowIcon direction="down" size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
