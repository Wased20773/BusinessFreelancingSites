"use client";

import EditIcon from "@/components/icons/edit.svg";
import RequiredField from "@/components/ui/RequiredField";
import { formatDateTime } from "@/lib/time/formatDateTime";
import axios from "axios";
import Image from "next/image";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { UserJson } from "@/types/types";
import LoadingBar from "@/components/ui/LoadingBar";
import Divider from "@/components/layout/Divider";

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
    return <LoadingBar />;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!accountData) {
    return <p className="p-5">Account could not be found.</p>;
  }

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="account-heading"
    >
      <div className="mb-6">
        <h1 id="account-heading" className="text-3xl font-semibold">
          Account
        </h1>
        <p className="mt-1 text-gray-500">
          Manage your personal account information.
        </p>
      </div>

      {/* Profile and account details */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          {accountData.image ? (
            <Image
              src={accountData.image}
              alt="Account profile"
              width={64}
              height={64}
              className="shrink-0 rounded-full border border-gray-300"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-xl font-semibold text-gray-700">
              {(accountData.name ?? accountData.email).charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {accountData.name ?? "Unnamed Account"}
            </h2>
            <p className="truncate text-sm text-gray-600">
              {accountData.email}
            </p>
          </div>
        </div>

        <Divider />

        {/* Name */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Name</h2>
              <p className="mt-1 text-sm text-gray-600">
                This name is displayed throughout the platform as your account
                identity.
              </p>
            </div>

            {!isEditingName && (
              <button
                type="button"
                aria-label="Edit account name"
                className="shrink-0 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
                onClick={() => setIsEditingName(true)}
              >
                <Image src={EditIcon} alt="" width={20} height={20} />
              </button>
            )}
          </div>

          {isEditingName ? (
            <form className="mt-4" onSubmit={handleNameSubmit}>
              <label
                className="font-medium text-gray-900"
                htmlFor="account-name"
              >
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
                className="mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
              />

              {nameError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {nameError}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={cancelNameEdit}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
                  className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Current Name</p>
              <p className="mt-1 font-medium text-gray-900">
                {accountData.name ?? "Not set"}
              </p>
            </div>
          )}
        </div>

        <Divider />

        {/* Username */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Username
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Your username provides another way to identify your account
                within the platform.
              </p>
            </div>

            {!isEditingUsername && (
              <button
                type="button"
                aria-label="Edit username"
                className="shrink-0 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
                onClick={() => setIsEditingUsername(true)}
              >
                <Image src={EditIcon} alt="" width={20} height={20} />
              </button>
            )}
          </div>

          {isEditingUsername ? (
            <form className="mt-4" onSubmit={handleUsernameSubmit}>
              <label
                className="font-medium text-gray-900"
                htmlFor="account-username"
              >
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
                className="mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
              />

              {usernameError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {usernameError}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingUsername}
                  onClick={cancelUsernameEdit}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
                  className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingUsername ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Current Username</p>
              <p className="mt-1 font-medium text-gray-900">
                {accountData.username ?? "Not set"}
              </p>
            </div>
          )}
        </div>

        <Divider />

        {/* Account Information */}
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Account Information
          </h2>

          <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-gray-600">Email</dt>
              <dd className="mt-1 break-all text-gray-900">
                {accountData.email}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Account Created</dt>
              <dd className="mt-1 text-gray-900">
                {formatDateTime(accountData.createdAt, "date")}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Last Updated</dt>
              <dd className="mt-1 text-gray-900">
                {formatDateTime(accountData.updatedAt, "date")}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Account deletion */}
      <section className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-5 shadow-red-400 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-red-800">
              Delete Account
            </h2>
            <p className="mt-1 text-sm text-red-700">
              Permanently delete your account and associated personal data.
            </p>
            <p className="mt-1 text-sm text-red-600">
              Account deletion is not available yet.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="shrink-0 cursor-not-allowed rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 opacity-60"
          >
            Delete Account
          </button>
        </div>
      </section>
    </section>
  );
}
