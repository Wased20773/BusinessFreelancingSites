"use client";

import ExitIconBlack from "@/components/icons/exit-black.svg";
import { deleteBusiness } from "@/lib/api/business";
import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";

type DeleteBusinessSectionProps = {
  businessId: string;
  businessName: string;
};

/*
 *   Danger zone for owners: permanently deletes the business after the owner
 *   types its name. Render this only for the owner access level; the API
 *   enforces the same rule.
 **/
export default function DeleteBusinessSection({
  businessId,
  businessName,
}: DeleteBusinessSectionProps) {
  const router = useRouter();
  const { update } = useSession();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [confirmName, setConfirmName] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameMatches = confirmName.trim() === businessName.trim();

  function closeModal() {
    if (isDeleting) return;

    setIsOpen(false);
    setConfirmName("");
    setErrorMessage(null);
  }

  async function handleDelete(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nameMatches) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise(
        deleteBusiness(businessId, confirmName),
        {
          loading: "Deleting business...",
          success: {
            message: "Business deleted.",
            description: `${businessName} was permanently deleted.`,
          },
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete business.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the business.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      /*
       * The membership no longer exists, so asking the session for this
       * business clears it from the token (see the jwt callback in auth.ts).
       */
      await update({ businessId });

      router.replace("/businesses");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete business:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete business.",
        );
      } else {
        setErrorMessage("Failed to delete business.");
      }

      setIsDeleting(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="delete-business-heading"
        className="mt-5 rounded-2xl border border-red-400 bg-red-50 p-5 shadow-sm shadow-red-400 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="delete-business-heading"
              className="text-base font-semibold text-red-700"
            >
              Delete Business
            </h2>

            <p className="mt-1 max-w-[700px] text-sm text-red-500">
              Permanently delete this business and everything in it. This
              cannot be undone.
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-red-400 bg-red-100 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-200"
            onClick={() => setIsOpen(true)}
          >
            Delete Business
          </button>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-business-modal-heading"
            className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-gray-300 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2
                  id="delete-business-modal-heading"
                  className="text-xl font-semibold"
                >
                  Delete {businessName}?
                </h2>
                <p className="mt-1 text-gray-500">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close delete business modal"
                disabled={isDeleting}
                className="p-1"
                onClick={closeModal}
              >
                <Image src={ExitIconBlack} alt="" width={22} height={22} />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">This permanently deletes:</p>

              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>Every location with its menu, items, hours, contacts, and socials</li>
                <li>All uploaded images, including the business image</li>
                <li>Every member&apos;s access to this business</li>
                <li>
                  All API keys. Websites using them stop working immediately.
                </li>
                <li>
                  All purchased location slots. They are not refunded and
                  can&apos;t be moved to another business.
                </li>
              </ul>
            </div>

            <form className="mt-5" onSubmit={handleDelete}>
              <label
                htmlFor="delete-business-confirm"
                className="text-sm text-gray-600"
              >
                To confirm, type the business name:
              </label>

              <p className="mt-1 font-semibold break-all">{businessName}</p>

              <input
                id="delete-business-confirm"
                name="delete-business-confirm"
                type="text"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={isDeleting}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 disabled:opacity-50"
              />

              {errorMessage && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!nameMatches || isDeleting}
                  className="rounded-lg border border-red-400 bg-red-100 px-4 py-2 font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Business"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
