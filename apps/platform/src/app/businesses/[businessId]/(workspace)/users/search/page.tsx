"use client";

import AddIcon from "@/components/icons/add.svg";
import GoogleLogoIcon from "@/components/icons/google-logo.svg";
import PlaceholderAccountIcon from "@/components/icons/placeholder-account-black.svg";
import SearchIcon from "@/components/icons/search.svg";
import { addUserToBusiness, searchForUser } from "@/lib/api/users";
import {
  ACCESS_LEVEL,
  type BusinessUserJson,
  type UserJson,
} from "@/types/types";

import axios from "axios";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";

import "../../page.css";
import PageState from "@/components/ui/PageState";
import PageHeading from "@/components/ui/PageHeader";

export default function SearchPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status } = useSession();

  const [searchData, setSearchData] = useState<UserJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [addingUserEmail, setAddingUserEmail] = useState<string | null>(null);

  const currentAccessLevel = session?.user?.accessLevel;
  const canAccessSearch =
    currentAccessLevel === "owner" || currentAccessLevel === "admin";
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

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
        searchForUser(businessId, {
          email: normalizedEmail,
        }),
        {
          loading: "Searching for user...",
          success: "User found.",
          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
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

      const data = await searchToast.unwrap();

      setSearchData(data);
      setHasSearched(true);
    } catch (error) {
      console.error("Error in Search page:", error);

      setSearchData(null);
      setHasSearched(true);

      if (
        axios.isAxiosError<{
          error?: string;
        }>(error)
      ) {
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
            description: `${
              data.user?.name ?? data.user?.email ?? "The user"
            } has the default ${data.role?.accessLevel ?? "staff"} access.`,
          }),
          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
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

      /*
       * Remove the result after the user
       * has been successfully added so
       * they cannot be submitted again.
       */
      setSearchData(null);
      setErrorMessage(null);
      setHasSearched(false);
    } catch (error) {
      console.error("Failed to add user to business:", error);
    } finally {
      setAddingUserEmail(null);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canAccessSearch,
    pageTitle: "Adding People",
    reason:
      "Your current access level denies access to adding people to the business.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      className="max-w-[1000px] mx-auto p-5 pt-0"
      aria-labelledby="search-heading"
    >
      {/* Heading */}
      <PageHeading
        path={`/businesses/${businessId}/users`}
        ariaLabel="Return to members"
        setIsLoading={setIsLoading}
        headingId="search-heading"
        heading="Add Member"
      />

      <p className="text-gray-500 mt-2">
        Search for an existing account and add them to this business.
      </p>

      {/* Search */}
      <section className="border border-gray-300 rounded-xl mt-5 p-5">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Find By Email</h2>

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
              border-[0.1rem]
              border-b-[0.2rem]
              border-blue-400
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
              flex
              items-center
              justify-center
              rounded-lg
              border
              border-gray-300
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
          {searchData ? (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Search Result
              </p>

              <div
                className="
                  grid
                  grid-cols-[auto_minmax(0,1fr)_auto]
                  items-center
                  gap-3
                  border
                  border-gray-200
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
                    flex
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-gray-300
                    p-2
                    hover:bg-gray-100
                    transition-colors
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  aria-label={`Add ${searchData.email}`}
                  disabled={addingUserEmail !== null}
                  onClick={() => void addUser(searchData.email)}
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
