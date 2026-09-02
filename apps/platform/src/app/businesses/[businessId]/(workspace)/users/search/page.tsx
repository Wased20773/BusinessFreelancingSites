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

export default function SearchPage() {
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
        axios
          .get<UserJson>("/api/admin/account/search", {
            params: { email: normalizedEmail },
          })
          .then((response) => response.data),
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
        axios
          .post<BusinessUserJson>("/api/admin/business-users", {
            email,
            accessLevel: "staff",
          })
          .then((response) => response.data),
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
    <div aria-labelledby="search-heading">
      <div className="flex items-center gap-2 mb-[1.5rem]">
        <Link href="/dashboard/users">
          <ArrowIcon direction="left" size={50} />
        </Link>
        <h1 id="search-heading">Search</h1>
      </div>

      <section>
        <form
          className="mb-5 grid grid-cols-[1fr_auto] gap-2"
          role="search"
          onSubmit={searchUser}
        >
          <label className="col-span-2" htmlFor="user-email">
            A user is unique by email. Enter an email address to search for a
            user.
          </label>

          <input
            id="user-email"
            name="email"
            className="w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-50 px-3 py-1"
            type="email"
            placeholder="user@email.com"
            autoComplete="email"
            required
            disabled={isLoading}
          />

          <button
            type="submit"
            aria-label="Search for user"
            disabled={isLoading}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image src={SearchIcon} alt="" width={25} height={25} />
          </button>
        </form>

        <ul className="dashboard-card">
          {isLoading ? (
            <li className="p-4 text-center">Searching users...</li>
          ) : searchData ? (
            <li key={searchData.id}>
              <article>
                <button
                  className="w-full flex flex-row items-center justify-between rounded-md p-2"
                  aria-label={`Add ${searchData.email}`}
                  disabled={addingUserEmail !== null}
                  onClick={() => addUser(searchData.email)}
                >
                  <div className="flex items-center overflow-x-auto">
                    <Image
                      className="rounded-full border-[2px] border-gray-800"
                      src={searchData.image || PlaceholderAccountIcon}
                      alt="Profile picture"
                      width={50}
                      height={50}
                    />
                    <div className="ml-[0.5rem] flex min-w-max items-center">
                      <Image
                        src={GoogleLogoIcon}
                        alt="Google account provider"
                        width={15}
                        height={15}
                      />
                      <span className="ml-[0.25rem]">{searchData.email}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      className="shrink-0 rounded-full border-2 border-gray-400 p-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Add ${searchData.email}`}
                      disabled={addingUserEmail !== null}
                    >
                      <Image src={AddIcon} alt="" width={20} height={20} />
                    </button>
                  </div>
                </button>
              </article>
            </li>
          ) : hasSearched ? (
            <li className="p-4 text-center">
              <p className="font-medium">No user found</p>
              <p className="mt-1 text-sm text-gray-600">
                {errorMessage ??
                  "Check the email address and try again. If the user is already in a business, they will not appear here again."}
              </p>
            </li>
          ) : (
            <li className="p-4 text-center text-gray-600">
              Enter an email address to search for a user.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
