import Image from "next/image";
import { Dispatch, SetStateAction, SubmitEvent } from "react";
import ExitIcon from "@/components/icons/exit-black.svg";
import RequiredField from "../RequiredField";

type CreateBusinessModalProps = {
  isSubmitting: boolean;
  setIsCreatingBusiness: Dispatch<SetStateAction<boolean>>;
  handleCreateBusiness(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  createErrorMessage: string | null;
};

export default function CreateBusinessModal({
  isSubmitting,
  setIsCreatingBusiness,
  handleCreateBusiness,
  createErrorMessage,
}: CreateBusinessModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
      onMouseDown={() => {
        if (!isSubmitting) {
          setIsCreatingBusiness(false);
        }
      }}
    >
      <div
        className="w-full max-w-[600px] bg-white border-[0.1rem] border-gray-300 rounded-lg px-5 py-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Modal Heading */}
        <div className="flex justify-between items-start gap-5">
          <div>
            <h2 className="text-xl font-semibold">Create Business</h2>

            <p className="text-gray-500 mt-1">
              Create a business and its first location.
            </p>
          </div>

          <button
            className="text-2xl leading-none disabled:opacity-50"
            type="button"
            aria-label="Close create business form"
            disabled={isSubmitting}
            onClick={() => setIsCreatingBusiness(false)}
          >
            <Image src={ExitIcon} alt="" width={20} height={20} />
          </button>
        </div>

        {/* Form */}
        <form
          className="flex flex-col gap-4 mt-5"
          onSubmit={handleCreateBusiness}
        >
          {/* Business Name */}
          <div>
            <label className="font-semibold" htmlFor="create-business-name">
              Business Name <RequiredField />
            </label>

            <input
              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
              id="create-business-name"
              name="name"
              type="text"
              placeholder="Enter your business name"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* First Location */}
          <div>
            <label className="font-semibold" htmlFor="create-business-address">
              First Location
            </label>

            <p className="text-sm text-gray-500 mt-1 mb-1">
              Enter the address for your first business location.
            </p>

            <input
              className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
              id="create-business-address"
              name="address"
              type="text"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Error */}
          {createErrorMessage && (
            <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
              {createErrorMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-3">
            <button
              className="border-[0.1rem] border-gray-400 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreatingBusiness(false)}
            >
              Cancel
            </button>

            <button
              className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
