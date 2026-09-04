"use client";

import EditIcon from "@/components/icons/edit.svg";
import RequiredField from "@/components/ui/RequiredField";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import axios from "axios";
import Image from "next/image";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { UserJson } from "@/types/types";

export default function AccountPage() {
  const { update } = useSession();

  const [accountData, setAccountData] = useState<UserJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Name
  const [name, setName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Username
  const [username, setUsername] = useState<string>("");
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [isSavingUsername, setIsSavingUsername] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    async function getAccountData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const accountToast = toast.promise<UserJson>(
          axios.get<UserJson>("/api/account").then((response) => response.data),
          {
            loading: "Loading account...",
            success: "Account loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load account.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading your account.",
              };
            },
          },
        );

        const data = await accountToast.unwrap();

        setAccountData(data);
        setName(data.name ?? "");
        setUsername(data.username ?? "");
      } catch (error) {
        console.error("Error loading account:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load account.",
          );
        } else {
          setErrorMessage("Failed to load account.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getAccountData();
  }, []);

  async function handleNameSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accountData) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("A name is required.");
      return;
    }

    if (trimmedName === (accountData.name ?? "")) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const updateToast = toast.promise<UserJson>(
        axios
          .patch<UserJson>("/api/account", {
            name: trimmedName,
          })
          .then((response) => response.data),
        {
          loading: "Updating name...",
          success: "Name updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update name.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating your name.",
            };
          },
        },
      );

      const updatedAccount = await updateToast.unwrap();

      setAccountData(updatedAccount);
      setName(updatedAccount.name ?? "");

      /*
       * Refresh the Auth.js session so any
       * navigation using session.user.name
       * updates immediately.
       */
      await update();

      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating account name:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setNameError(
          error.response?.data?.error ?? "Failed to update your name.",
        );
      } else {
        setNameError("Failed to update your name.");
      }
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleUsernameSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accountData) return;

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setUsernameError("A username is required.");
      return;
    }

    if (trimmedUsername === (accountData.username ?? "")) {
      setIsEditingUsername(false);
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);

    try {
      const updateToast = toast.promise<UserJson>(
        axios
          .patch<UserJson>("/api/account", {
            username: trimmedUsername,
          })
          .then((response) => response.data),
        {
          loading: "Updating username...",
          success: "Username updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update username.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating your username.",
            };
          },
        },
      );

      const updatedAccount = await updateToast.unwrap();

      setAccountData(updatedAccount);
      setUsername(updatedAccount.username ?? "");

      setIsEditingUsername(false);
    } catch (error) {
      console.error("Error updating username:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setUsernameError(
          error.response?.data?.error ?? "Failed to update your username.",
        );
      } else {
        setUsernameError("Failed to update your username.");
      }
    } finally {
      setIsSavingUsername(false);
    }
  }

  function cancelNameEdit() {
    if (!accountData) return;

    setName(accountData.name ?? "");
    setNameError(null);
    setIsEditingName(false);
  }

  function cancelUsernameEdit() {
    if (!accountData) return;

    setUsername(accountData.username ?? "");
    setUsernameError(null);
    setIsEditingUsername(false);
  }

  if (isLoading) {
    return <p>Loading account...</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  if (!accountData) {
    return <p>Account could not be found.</p>;
  }

  return (
    <section
      className="max-w-[1000px] mx-auto"
      aria-labelledby="account-heading"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 id="account-heading" className="text-3xl font-semibold">
          Account
        </h1>

        <p className="text-gray-500 mt-1">
          Manage your personal account information.
        </p>
      </div>

      {/* Profile */}
      <section className="border border-gray-300 rounded-xl p-5">
        <div className="flex items-center gap-4">
          {accountData.image ? (
            <Image
              src={accountData.image}
              alt="Account profile"
              width={64}
              height={64}
              className="rounded-full border border-gray-300"
            />
          ) : (
            <div className="flex items-center justify-center size-16 rounded-full border border-gray-300 bg-gray-100 text-xl font-semibold">
              {(accountData.name ?? accountData.email).charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">
              {accountData.name ?? "Unnamed Account"}
            </h2>

            <p className="text-sm text-gray-500 truncate">
              {accountData.email}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Name */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Name</h2>

              <p className="text-sm text-gray-500 mt-1">
                This name is displayed throughout the platform as your account
                identity.
              </p>
            </div>

            {!isEditingName && (
              <button
                type="button"
                aria-label="Edit account name"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEditingName(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEditingName ? (
            <form className="mt-4" onSubmit={handleNameSubmit}>
              <label className="font-semibold" htmlFor="account-name">
                Name <RequiredField />
              </label>

              <input
                id="account-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSavingName}
                required
                className="
                  block w-full mt-1
                  rounded-lg
                  border-[0.1rem] border-b-[0.2rem]
                  border-blue-400
                  bg-gray-100
                  px-3 py-2
                  disabled:opacity-50
                "
              />

              {nameError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {nameError}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={cancelNameEdit}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSavingName ||
                    !name.trim() ||
                    name.trim() === (accountData.name ?? "")
                  }
                  className="rounded-lg border border-green-500 bg-emerald-300 px-4 py-2 text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Name</p>

              <p className="font-medium mt-1">
                {accountData.name ?? "Not set"}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Username */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Username</h2>

              <p className="text-sm text-gray-500 mt-1">
                Your username provides another way to identify your account
                within the platform.
              </p>
            </div>

            {!isEditingUsername && (
              <button
                type="button"
                aria-label="Edit username"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEditingUsername(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEditingUsername ? (
            <form className="mt-4" onSubmit={handleUsernameSubmit}>
              <label className="font-semibold" htmlFor="account-username">
                Username <RequiredField />
              </label>

              <input
                id="account-username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSavingUsername}
                required
                className="
                  block w-full mt-1
                  rounded-lg
                  border-[0.1rem] border-b-[0.2rem]
                  border-blue-400
                  bg-gray-100
                  px-3 py-2
                  disabled:opacity-50
                "
              />

              {usernameError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {usernameError}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={isSavingUsername}
                  onClick={cancelUsernameEdit}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSavingUsername ||
                    !username.trim() ||
                    username.trim() === (accountData.username ?? "")
                  }
                  className="rounded-lg border border-green-500 bg-emerald-300 px-4 py-2 text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingUsername ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Username</p>

              <p className="font-medium mt-1">
                {accountData.username ?? "Not set"}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Account Information */}
        <div>
          <h2 className="text-xl font-semibold">Account Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>

              <p className="font-medium mt-1 break-all">{accountData.email}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Account Created</p>

              <p className="font-medium mt-1">
                {formatDateTime(accountData.createdAt, "date")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Last Updated</p>

              <p className="font-medium mt-1">
                {formatDateTime(accountData.updatedAt, "date")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="border border-red-400 bg-red-50 rounded-xl p-5 mt-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-red-700">
              Delete Account
            </h2>

            <p className="text-sm text-red-500 mt-1">
              Permanently delete your account and associated personal data.
            </p>

            <p className="text-sm text-red-400 mt-1">
              Account deletion is not available yet.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="
              shrink-0
              rounded-lg
              border border-red-300
              bg-red-50
              px-4 py-2
              font-medium text-red-500
              cursor-not-allowed
              opacity-60
            "
          >
            Delete Account
          </button>
        </div>
      </section>
    </section>
  );
}
