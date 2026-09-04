"use client";

import ArrowIcon from "@/components/icons/arrow";
import SearchIcon from "@/components/icons/search.svg";
import Image from "next/image";
import Link from "next/link";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import "../../page.css";
import AddIcon from "@/components/icons/add.svg";
import GoogleLogoIcon from "@/components/icons/google-logo.svg";
import type { BusinessUserJson, UserJson } from "@/types/types";
import { useState } from "react";
import type { SubmitEvent } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { addUserToBusiness, searchForUser } from "@/lib/api/users";

export default function SearchPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [searchData, setSearchData] = useState<UserJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [addingUserEmail, setAddingUserEmail] = useState<string | null>(null);

  async function searchUser(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    if (typeof email !== "string" || !email.trim()) {
      return;
    }

    const normalizedEmail = email.trim();

    setIsLoading(true);
    setSearchData(null);
    setErrorMessage(null);
    setHasSearched(false);

    try {
      const searchToast = toast.promise<UserJson>(
        searchForUser(businessId, { email: normalizedEmail }),
        {
          loading: "Searching for user...",
          success: "User found.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              if (error.response?.status === 404) {
                return {
                  message: "No user found.",
                  description:
                    "Check the email address and try again. The user may already belong to a business.",
                };
              }

              return {
                message: "Failed to search for a user.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while searching for a user.",
            };
          },
        },
      );

      const data: UserJson = await searchToast.unwrap();

      setSearchData(data);
      setHasSearched(true);
    } catch (error) {
      console.error("Error in Search page:", error);

      setSearchData(null);
      setHasSearched(true);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        if (error.response?.status === 404) {
          setErrorMessage("No user found.");
        } else {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to search for a user.",
          );
        }
      } else {
        setErrorMessage("Failed to search for a user.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function addUser(email: string) {
    if (addingUserEmail) {
      return;
    }

    setAddingUserEmail(email);

    try {
      const addToast = toast.promise<BusinessUserJson>(
        addUserToBusiness(businessId, email),
        {
          loading: "Adding user to business...",
          success: (data) => ({
            message: "User added.",
            description: `${data.user?.name ?? data.user?.email ?? "The user"} has the default ${
              data.role?.accessLevel ?? "staff"
            } access.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to add user.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while adding the user to the business.",
            };
          },
        },
      );

      await addToast.unwrap();

      // Remove the result after the user has been successfully added so they
      // cannot be submitted again from this page.
      setSearchData(null);
      setErrorMessage(null);
      setHasSearched(false);
    } catch (error) {
      console.error("Failed to add user to business:", error);
    } finally {
      setAddingUserEmail(null);
    }
  }

  return (
    <section
      className="max-w-[1000px] mx-auto"
      aria-labelledby="search-heading"
    >
      {/* Heading */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/businesses/${businessId}/users`}
          aria-label="Return to members"
          className="shrink-0"
        >
          <ArrowIcon direction="left" size={42} />
        </Link>

        <div>
          <h1 id="search-heading" className="text-3xl font-semibold">
            Add Member
          </h1>

          <p className="text-gray-500 mt-1">
            Search for an existing account and add them to this business.
          </p>
        </div>
      </div>

      {/* Search */}
      <section className="border border-gray-300 rounded-xl p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Find a Member</h2>

          <p className="text-sm text-gray-500 mt-1">
            Accounts are uniquely identified by their email address.
          </p>
        </div>

        <form
          className="flex items-stretch gap-2"
          role="search"
          onSubmit={searchUser}
        >
          <input
            id="user-email"
            name="email"
            className="
            min-w-0 flex-1
            rounded-lg
            border-[0.1rem] border-b-[0.2rem] border-blue-400
            bg-gray-50
            px-3 py-2
            disabled:opacity-50
          "
            type="email"
            placeholder="user@email.com"
            autoComplete="email"
            aria-label="User email address"
            required
            disabled={isLoading}
          />

          <button
            type="submit"
            aria-label="Search for user"
            disabled={isLoading}
            className="
            flex items-center justify-center
            rounded-lg
            border border-gray-300
            px-4
            hover:bg-gray-100
            transition-colors
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          >
            <Image src={SearchIcon} alt="" width={20} height={20} />
          </button>
        </form>

        {/* Result */}
        <div className="border-t border-gray-200 mt-5 pt-5">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="font-medium">Searching...</p>
              <p className="text-sm text-gray-500 mt-1">
                Looking for an account with that email address.
              </p>
            </div>
          ) : searchData ? (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Search Result
              </p>

              <div
                className="
                grid grid-cols-[auto_minmax(0,1fr)_auto]
                items-center gap-3
                border border-gray-200
                rounded-lg
                p-3
              "
              >
                {/* Profile */}
                <Image
                  className="rounded-full border border-gray-300 shrink-0"
                  src={searchData.image || PlaceholderAccountIcon}
                  alt="Profile picture"
                  width={42}
                  height={42}
                />

                {/* Account */}
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {searchData.name || "Unnamed Account"}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                    <Image
                      src={GoogleLogoIcon}
                      alt="Google account provider"
                      width={14}
                      height={14}
                    />

                    <span className="text-sm text-gray-500 truncate">
                      {searchData.email}
                    </span>
                  </div>
                </div>

                {/* Add */}
                <button
                  type="button"
                  className="
                  flex items-center justify-center
                  rounded-lg
                  border border-gray-300
                  p-2
                  hover:bg-gray-100
                  transition-colors
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                  aria-label={`Add ${searchData.email}`}
                  disabled={addingUserEmail !== null}
                  onClick={() => addUser(searchData.email)}
                >
                  <Image src={AddIcon} alt="" width={18} height={18} />
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                New members are added with Staff access by default.
              </p>
            </div>
          ) : hasSearched ? (
            <div className="py-8 text-center">
              <p className="font-medium">No account found</p>

              <p className="text-sm text-gray-500 mt-1">
                {errorMessage ??
                  "Check the email address and try your search again."}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="font-medium">Search for an account</p>

              <p className="text-sm text-gray-500 mt-1">
                Enter an email address above to get started.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
