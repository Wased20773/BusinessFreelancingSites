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
import type { BusinessUserJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import ActionItem from "@/components/ui/ActionItem";
import { getBusinessUsers } from "@/lib/api/users";
import { useParams } from "next/navigation";

const USERS_PER_PAGE = 5;

export default function UsersPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [businessUserData, setBusinessUserData] = useState<BusinessUserJson[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visibleUsers, setVisibleUsers] = useState<number>(USERS_PER_PAGE);

  useEffect(() => {
    async function getBusinessUserData() {
      setIsLoading(true);

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
      } catch (e) {
        console.error("Error in Business User's page: ", e);

        if (axios.isAxiosError<{ error?: string }>(e)) {
          setErrorMessage(
            e.response?.data?.error ?? "Failed to load business user data.",
          );
        } else {
          setErrorMessage("Failed to load business user data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getBusinessUserData();
  }, []);

  if (isLoading) {
    return <p>Loading Users</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  return (
    <section className="max-w-[1000px] mx-auto" aria-labelledby="users-heading">
      {/* Heading */}
      <div className="mb-6">
        <h1 id="users-heading" className="text-3xl font-semibold">
          Members
        </h1>

        <p className="text-gray-500 mt-1">
          Manage the people who have access to this business.
        </p>
      </div>

      {/* Actions */}
      <section className="workspace-card mb-5">
        <ActionItem
          href={`/businesses/${businessId}/users/access-level`}
          icon={KeyIcon}
          label="Access Levels"
        />

        <Divider />

        <ActionItem
          href={`/businesses/${businessId}/users/search`}
          icon={SearchIcon}
          label="Add Member"
        />
      </section>

      {/* Members */}
      <section className="border border-gray-300 rounded-xl p-5">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Business Members</h2>

            <p className="text-sm text-gray-500 mt-1">
              View and manage member access for this business.
            </p>
          </div>

          <span className="text-sm text-gray-500 whitespace-nowrap">
            {businessUserData.length}{" "}
            {businessUserData.length === 1 ? "member" : "members"}
          </span>
        </div>

        {businessUserData.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg px-5 py-8 text-center">
            <p className="font-semibold">No members found</p>

            <p className="text-sm text-gray-500 mt-1">
              Add a member by searching for their email address.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {businessUserData.slice(0, visibleUsers).map((businessUser) => (
              <Link
                key={businessUser.id}
                href={`/businesses/${businessId}/users/${
                  businessUser.user?.id || "not-found"
                }`}
                className="
                grid grid-cols-[auto_minmax(0,1fr)_auto]
                items-center gap-3
                border border-gray-200 rounded-lg
                px-4 py-3
                hover:bg-gray-50 hover:border-gray-300
                transition-colors
              "
              >
                {/* Profile */}
                <Image
                  className="rounded-full border border-gray-300 shrink-0"
                  src={businessUser.user?.image || PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={40}
                  height={40}
                />

                {/* Member Info */}
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {businessUser.user?.name || "Missing name"}
                  </p>

                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={14}
                      height={14}
                    />

                    <span className="text-sm text-gray-500 truncate">
                      {businessUser.user?.email || "Missing email"}
                    </span>
                  </div>
                </div>

                {/* Role */}
                <span className="text-sm capitalize bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
                  {businessUser.role?.accessLevel || "Missing role"}
                </span>
              </Link>
            ))}

            {visibleUsers < businessUserData.length && (
              <button
                className="
                flex justify-center items-center gap-1
                border border-gray-300 rounded-lg
                py-2 mt-2
                hover:bg-gray-50
                transition-colors
              "
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
      </section>
    </section>
  );
}
