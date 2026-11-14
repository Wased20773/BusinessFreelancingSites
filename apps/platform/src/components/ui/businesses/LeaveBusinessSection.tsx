"use client";

import ExitIconBlack from "@/components/icons/exit-black.svg";
import { leaveBusiness } from "@/lib/api/business";
import { requestError } from "@/lib/api/requestError";
import axios from "axios";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type LeaveBusinessSectionProps = {
  businessId: string;
  businessName: string;
};

/*
 *   Lets a member leave the business. Render this for everyone except the
 *   owner, who transfers ownership or deletes the business instead; the API
 *   enforces the same rule.
 **/
export default function LeaveBusinessSection({
  businessId,
  businessName,
}: LeaveBusinessSectionProps) {
  const router = useRouter();
  const { update } = useSession();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function closeModal() {
    if (isLeaving) return;

    setIsOpen(false);
    setErrorMessage(null);
  }

  async function handleLeave() {
    setIsLeaving(true);
    setErrorMessage(null);

    try {
      await toast
        .promise(leaveBusiness(businessId), {
          loading: "Leaving business...",
          success: {
            message: "You left the business.",
            description: `You no longer have access to ${businessName}.`,
          },
          error: requestError("Failed to leave the business."),
        })
        .unwrap();

      /*
       * The membership no longer exists, so asking the session for this
       * business clears it from the token (see the jwt callback in auth.ts).
       */
      await update({ businessId });

      router.replace("/businesses");
      router.refresh();
    } catch (error) {
      console.error("Failed to leave business:", error);

      setErrorMessage(
        axios.isAxiosError<{ error?: string }>(error)
          ? (error.response?.data?.error ?? "Failed to leave the business.")
          : "Failed to leave the business.",
      );
      setIsLeaving(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="leave-business-heading"
        className="mt-5 rounded-2xl border border-red-400 bg-red-50 p-5 shadow-sm shadow-red-400 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="leave-business-heading"
              className="text-base font-semibold text-red-700"
            >
              Leave Business
            </h2>

            <p className="mt-1 max-w-[700px] text-sm text-red-500">
              Remove yourself from this business. You&apos;ll lose access until
              someone adds you again.
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 rounded-lg border border-red-400 bg-red-100 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-200"
            onClick={() => setIsOpen(true)}
          >
            Leave Business
          </button>
        </div>
      </section>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-business-modal-heading"
            className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-gray-300 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2
                  id="leave-business-modal-heading"
                  className="text-xl font-semibold break-all"
                >
                  Leave {businessName}?
                </h2>
                <p className="mt-1 text-gray-500">
                  An owner or admin can add you back later.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close leave business modal"
                disabled={isLeaving}
                className="p-1"
                onClick={closeModal}
              >
                <Image src={ExitIconBlack} alt="" width={22} height={22} />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">When you leave:</p>

              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                <li>You lose access to this business and all its locations.</li>
                <li>
                  If you pay for its plan, the plan ends after the month
                  you&apos;ve paid for and won&apos;t charge you again. Anyone
                  in the business can subscribe to keep it.
                </li>
                <li>
                  Location slots you bought stay with the business. They
                  aren&apos;t refunded.
                </li>
              </ul>
            </div>

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
                disabled={isLeaving}
                className="rounded-lg border border-gray-300 px-4 py-2 disabled:opacity-50"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isLeaving}
                className="rounded-lg border border-red-400 bg-red-100 px-4 py-2 font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleLeave}
              >
                {isLeaving ? "Leaving..." : "Leave Business"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
