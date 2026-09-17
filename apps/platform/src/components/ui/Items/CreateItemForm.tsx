"use client";

import ChevronIcon from "@/components/icons/chevron";
import Divider from "@/components/layout/Divider";
import Image from "next/image";
import type {
  ChangeEvent,
  Dispatch,
  InputEvent,
  SetStateAction,
  SubmitEvent,
} from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import RequiredField from "../RequiredField";

type CreateItemFormProps = {
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;

  isLoading: boolean;
  isCreating: boolean;

  errorMessage: string | null;
  errorMessageImage: string | null;

  canSubmit: boolean;
  latestOrder: number;

  hasSyncGroup: boolean;
  isSynced: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;

  imagePreview: string | null;

  cropImageSrc: string | null;
  crop: Point;
  zoom: number;
  croppedAreaPixels: Area | null;

  handleImageChange(event: ChangeEvent<HTMLInputElement>): void;

  setCrop: Dispatch<SetStateAction<Point>>;
  setZoom: Dispatch<SetStateAction<number>>;

  handleCropComplete(croppedArea: Area, croppedAreaPixels: Area): void;
  handleUseCrop(): Promise<void>;
  handleEditCrop(): void;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

const labelClass = "font-medium text-gray-900";

export default function CreateItemForm({
  handleSubmit,
  handleFormInput,
  isLoading,
  isCreating,
  errorMessage,
  errorMessageImage,
  canSubmit,
  latestOrder,
  hasSyncGroup,
  isSynced,
  setIsSynced,
  imagePreview,
  cropImageSrc,
  crop,
  zoom,
  croppedAreaPixels,
  handleImageChange,
  setCrop,
  setZoom,
  handleCropComplete,
  handleUseCrop,
  handleEditCrop,
}: CreateItemFormProps) {
  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="p-5 sm:p-6">
        <fieldset disabled={isLoading || isCreating}>
          <legend className="text-base font-semibold text-gray-900">
            Item info
          </legend>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="item-name" className={labelClass}>
                Name
                <RequiredField />
              </label>
              <input
                className={inputClass}
                id="item-name"
                name="name"
                type="text"
                required
              />
            </div>

            <div>
              <label htmlFor="item-description" className={labelClass}>
                Description
              </label>
              <textarea
                className={inputClass}
                id="item-description"
                name="description"
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="item-contains" className={labelClass}>
                What does the item contain? Please separate with a comma.
              </label>
              <input
                className={inputClass}
                id="item-contains"
                name="containsList"
                type="text"
                placeholder="pepper, salt, onions ..."
              />
            </div>

            <div>
              <label htmlFor="item-calories" className={labelClass}>
                Calories (kcal)
              </label>
              <input
                className={inputClass}
                id="item-calories"
                name="calories"
                type="number"
                min="0"
                step="5"
              />
            </div>

            <div>
              <label htmlFor="item-image" className={labelClass}>
                Image
              </label>
              <input
                className={inputClass}
                id="item-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />

              {cropImageSrc && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Adjust the image crop below.
                  </p>

                  <div className="relative mt-3 h-[400px] w-full overflow-hidden rounded-lg bg-black">
                    <Cropper
                      image={cropImageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={handleCropComplete}
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleUseCrop()}
                      disabled={!croppedAreaPixels}
                      className="rounded-lg border border-blue-500 bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {!cropImageSrc && imagePreview && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleEditCrop}
                    className="block"
                    aria-label="Adjust item image crop"
                  >
                    <Image
                      src={imagePreview}
                      alt="Item image preview"
                      width={300}
                      height={300}
                      className="max-h-[300px] w-auto rounded-md object-contain"
                    />
                  </button>

                  <p className="mt-2 text-sm text-gray-600">
                    Select the image to adjust the crop.
                  </p>
                </div>
              )}

              {errorMessageImage && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {errorMessageImage}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="item-price" className={labelClass}>
                Price
                <RequiredField />
              </label>
              <input
                className={inputClass}
                id="item-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>
        </fieldset>

        <Divider />

        <div>
          <p className="text-sm font-medium text-gray-900">Display Order</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            A lower order appears first on your website. You can reorder items
            in the items list using the{" "}
            <span className="inline-flex items-center align-middle">
              <ChevronIcon direction="up" size={18} />
            </span>{" "}
            and{" "}
            <span className="inline-flex items-center align-middle">
              <ChevronIcon direction="down" size={18} />
            </span>{" "}
            buttons.
          </p>

          <p className="mt-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
            Display Order: {latestOrder}
          </p>
        </div>

        {hasSyncGroup && (
          <>
            <Divider />
            <IsSyncedCheckbox
              hasSyncGroup={hasSyncGroup}
              htmlFor="sync-items"
              inputName="sync-items"
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isLoading || isCreating}
              description="Creates this item for all locations in the same synced category."
            />
          </>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-300 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isCreating || isLoading || !canSubmit}
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
