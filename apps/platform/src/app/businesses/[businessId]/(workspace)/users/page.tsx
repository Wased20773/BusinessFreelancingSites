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

const USERS_PER_PAGE = 5;

export default function UsersPage() {
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
          axios
            .get<BusinessUserJson[]>("/api/admin/business-users")
            .then((response) => response.data),
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
    <div aria-labelledby="users-heading">
      <h1 id="users-heading">Users</h1>
      {/* Business.Role: accessLevel, description */}
      {/* BusinessUser.Role: accessLevel */}
      {/* BusinessUser.User: image, name, username, email, emailVerified, createdAt, updatedAt */}
      {/* BusinessUser.User.Account: provider */}
      <div className="mt-[1.5rem]">
        {/* Links */}
        <section className="dashboard-card">
          <ActionItem
            href="/dashboard/users/access-level"
            icon={KeyIcon}
            label="Access Levels"
          />

          <Divider />

          <ActionItem
            href="/dashboard/users/search"
            icon={SearchIcon}
            label="Search"
          />
        </section>

        <Divider />

        <section>
          <div className="dashboard-card flex flex-col gap-3">
            {businessUserData.length === 0 ? (
              <div>
                <p className="font-semibold">You have no users</p>
                <p className="text-gray-500">
                  You can add a user by searching for their email address.
                </p>
              </div>
            ) : (
              <>
                <p>
                  You can click a user to view more details. You will not show
                  up on this list. If you would like to view your account
                  details, you can click on your account profile picture in the
                  navigation window
                </p>
                <p>
                  {businessUserData.length}{" "}
                  {businessUserData.length === 1 ? "user found" : "users found"}
                  .
                </p>
                {businessUserData.slice(0, visibleUsers).map((businessUser) => (
                  <Link
                    key={businessUser.id}
                    className="flex flex-row items-stretch rounded-md bg-gray-200"
                    href={`/dashboard/users/${businessUser.user?.id || "not-found"}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col overflow-x-auto gap-3 p-2">
                      <div className="min-w-max flex items-center gap-2">
                        <Image
                          className="rounded-full border-2 border-gray-800"
                          src={
                            businessUser.user?.image || PlaceholderAccountIcon
                          }
                          alt="Profile picture"
                          width={30}
                          height={30}
                        />

                        <p>{businessUser.user?.name || "Missing name"}</p>
                      </div>

                      <div className="flex w-fit min-w-max min-w-0 items-center gap-2 rounded-md bg-gray-100 px-2 py-1">
                        <div className="flex items-center justify-center">
                          <Image
                            src={GoogleLogoIcon}
                            alt="Google account provider"
                            width={15}
                            height={15}
                          />
                        </div>

                        <span className="text-gray-500">
                          {businessUser.user?.email || "Missing email"}
                        </span>
                      </div>
                    </div>

                    <div className="w-[4.5rem] flex justify-center items-center rounded-r-md border-l-[0.1rem] border-l-gray-400 bg-gray-300 px-3">
                      <p className="text-gray-600">
                        {businessUser.role?.accessLevel || "Missing role"}
                      </p>
                    </div>
                  </Link>
                ))}

                {visibleUsers < businessUserData.length && (
                  <button
                    className="flex justify-center items-center"
                    type="button"
                    onClick={() =>
                      setVisibleUsers((current) => current + USERS_PER_PAGE)
                    }
                  >
                    <span className="mr-1">Load More</span>
                    <ArrowIcon direction="down" />
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
