"use client";

import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import "../../page.css";
import Divider from "@/components/layout/Divider";
import Image from "next/image";
import TrashIcon from "@/components/icons/trash-red.svg";
import EditIcon from "@/components/icons/edit.svg";
import { useEffect, useState } from "react";
import axios from "axios";
import type { BusinessUserJson } from "@/types/types";
import type { SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import ExitIconBlack from "@/components/icons/exit-black.svg";
import { toast } from "sonner";
import RequiredField from "@/components/ui/RequiredField";

type UserDetailsPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
  const [userData, setUserData] = useState<BusinessUserJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>("");

  const [clickedDelete, setClickedDelete] = useState<boolean>(false);
  const [loadingDelete, setLoadingDelete] = useState<boolean>(false);
  const [deleteVerification, setDeleteVerification] = useState<string>("");

  const router = useRouter();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);

    try {
      const updateResponse = toast.promise<BusinessUserJson>(
        axios
          .patch<BusinessUserJson>(
            `/api/admin/business-users/${userData[0].id}`,
            {
              accessLevel: selectedAccessLevel,
            },
          )
          .then((response) => response.data),
        {
          loading: "Updating access level...",
          success: (data) => {
            const accessLevel = data.role?.accessLevel;

            if (!accessLevel) {
              return {
                message: "Access level updated.",
                description: "Could not retrieve access level name.",
              };
            }

            const formattedAccessLevel =
              accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1);

            return {
              message: `${formattedAccessLevel} access granted.`,
              description: `${userData[0].user?.name ? userData[0].user.name : "This user"} now has ${accessLevel} access.`,
            };
          },
          error: "Failed to update the user's access level.",
        },
      );

      const updatedUser: BusinessUserJson = await updateResponse.unwrap();

      setUserData((current) =>
        current.map((businessUser) =>
          businessUser.id === updatedUser.id
            ? {
                ...businessUser,
                role: updatedUser.role,
              }
            : businessUser,
        ),
      );

      setIsEdit(false);
    } catch (e) {
      console.error("Failed to update business user: ", e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (deleteVerification !== userData[0].user?.email) {
      return;
    }

    setLoadingDelete(true);

    try {
      const deleteToast = toast.promise<{ message: string }>(
        axios
          .delete<{
            message: string;
          }>(`/api/admin/business-users/${userData[0].id}`)
          .then((response) => response.data),
        {
          loading: "Removing user...",
          success: (data) => data.message,
          error: "Failed to remove user from the business.",
        },
      );

      await deleteToast.unwrap();

      router.push("/dashboard/users");

      setClickedDelete(false);
      setDeleteVerification("");
    } catch (e) {
      console.error("Failed to remove user from business: ", e);
    } finally {
      setLoadingDelete(false);
    }
  }

  useEffect(() => {
    async function getUserData() {
      const { userId } = await params;

      setIsLoading(true);

      try {
        const userResponse = toast.promise<BusinessUserJson[]>(
          axios
            .get<
              BusinessUserJson[]
            >("/api/admin/business-users", { params: { userId } })
            .then((response) => response.data),
          {
            loading: "Loading user info...",
            success: (data) => {
              if (data.length === 0) {
                return {
                  message: "User not found.",
                  description:
                    "This user may have already been removed from the business.",
                };
              }
              return {
                message: "User loaded.",
                description: `${data[0].user?.name ?? "The user"} was found.`,
              };
            },
            error: (error) => {
              if (axios.isAxiosError(error)) {
                return {
                  message: "Failed to load user info.",
                  description: `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error:",
                description:
                  "Something went wrong while loading the user information.",
              };
            },
          },
        );

        const data: BusinessUserJson[] = await userResponse.unwrap();

        setUserData(data);
        setSelectedAccessLevel(data[0]?.role?.accessLevel ?? "");
      } catch (e) {
        console.error("Error in User's page: ", e);

        if (axios.isAxiosError(e)) {
          setErrorMessage(
            e.response?.data?.error ?? "Failed to load user data.",
          );
        } else {
          setErrorMessage("Failed to load business user data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getUserData();
  }, [params]);

  if (isLoading) {
    return <p>Loading user...</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  if (userData.length === 0) {
    return <p>User not found.</p>;
  }

  if (!userData[0].user?.email) {
    return <p>User not found</p>;
  }

  return (
    <div aria-labelledby="user-details-heading">
      <div className="flex items-center gap-2 mb-[1.5rem]">
        <Link href="/dashboard/users">
          <ArrowIcon direction="left" size={50} />
        </Link>
        <h1 id="user-details-heading">User details</h1>
      </div>
      {/* BusinessUser.Role: accessLevel */}
      {/* BusinessUser.User: image, name, username, email, emailVerified, createdAt, updatedAt */}
      {/* BusinessUser.User.Account: provider */}

      <section className="dashboard-card mb-4">
        <h2>General</h2>

        <div className="flex flex-col">
          <p>
            Name: <span>{userData[0].user.name ?? "Missing name"}</span>
          </p>
          <p>
            Email: <span>{userData[0].user.email ?? "Missing email"}</span>
          </p>
          <p>
            Username: <span>{userData[0].user.username}</span>
          </p>
        </div>
      </section>

      <section className="dashboard-card mb-4">
        <div className="flex justify-between">
          <h2>Permissions</h2>

          <button
            type="button"
            aria-label="Edit user permissions"
            onClick={() => setIsEdit((prev) => !prev)}
          >
            <Image src={EditIcon} alt="" width={30} height={30} />
          </button>
        </div>

        {isEdit ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="user-access-level">
              Access Level: <RequiredField />
            </label>
            <select
              id="user-access-level"
              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
              name="access-level"
              value={selectedAccessLevel}
              onChange={(event) => setSelectedAccessLevel(event.target.value)}
              required
            >
              {/* TODO: Only owner can pass ownership */}
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>

            <button
              className="mt-3 ml-auto bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        ) : (
          <p>
            Access Level:{" "}
            <span className="block w-full border-[0.1rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2 text-gray-500">
              {userData[0].role?.accessLevel}
            </span>
          </p>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Timestamps</h2>

        <div className="flex flex-col">
          <h3>User</h3>
          <p>
            createdAt: <span>{userData[0].user?.createdAt}</span>
          </p>
          <p>
            updatedAt: <span>{userData[0].user?.updatedAt}</span>
          </p>
          <h3>Business</h3>
          <p>
            createdAt: <span>{userData[0].createdAt}</span>
          </p>
          <p>
            updatedAt: <span>{userData[0].updatedAt}</span>
          </p>
        </div>
      </section>

      <Divider />

      <button
        className="w-full border border-red-500 rounded-2xl bg-red-300 flex justify-center items-center px-3 py-1"
        type="button"
        aria-label="Remove user from business"
        onClick={() => setClickedDelete(true)}
      >
        <Image src={TrashIcon} alt="" />
      </button>

      {/* Model for delete notice */}
      {clickedDelete && (
        <div className="fixed inset-0 z-10 flex justify-center items-center bg-black/25">
          <div className="bg-gray-50 mx-3 p-5 rounded-lg ">
            <div className="flex justify-between items-center">
              <h4>Remove</h4>
              <button
                type="button"
                className="p-1"
                aria-label="Exit this action"
                onClick={() => {
                  setClickedDelete(false);
                  setDeleteVerification("");
                }}
              >
                <Image
                  src={ExitIconBlack}
                  alt=""
                  width={30}
                  height={30}
                  loading="eager"
                />
              </button>
            </div>

            <div>
              <p>Are you sure you want to remove this user?</p>
              <p>
                This user will no longer have access to this business or its
                contents. You can add them back by searching them in the{" "}
                <span className="font-semibold">Users </span>page.
              </p>
            </div>

            <form
              onSubmit={handleDelete}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            >
              <p>To remove type:</p>
              <label className="text-gray-500" htmlFor="remove-user">
                {userData[0].user.email}
              </label>
              <input
                type="text"
                id="remove-user"
                name="remove"
                value={deleteVerification}
                onChange={(event) => setDeleteVerification(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded border px-3 py-2 bg-gray-200 mt-2 mb-4"
              ></input>
              <button
                className="
                  flex w-full items-center justify-center rounded-2xl
                  border border-red-300 bg-red-100 px-3 py-1
                  disabled:cursor-not-allowed disabled:opacity-50
                "
                type="submit"
                disabled={
                  deleteVerification !== userData[0].user.email || loadingDelete
                }
                aria-label="Remove user from business"
              >
                <Image src={TrashIcon} alt="" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
