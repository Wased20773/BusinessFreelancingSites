"use client";

import Divider from "@/components/layout/Divider";
import type { ItemJson } from "@/types/types";
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

type EditItemFormParams = {
  canManage: boolean;
  itemData: ItemJson;
  imagePreview: string | null;
  cropImageSrc: string | null;
  crop: Point;
  zoom: number;
  croppedAreaPixels: Area | null;
  errorMessageImage: string | null;
  canSubmit: boolean;
  isProcessing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isSynced: boolean;
  hasSyncGroup: boolean;
  setIsSynced: Dispatch<SetStateAction<boolean>>;
  setCrop: Dispatch<SetStateAction<Point>>;
  setZoom: Dispatch<SetStateAction<number>>;
  handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void>;
  handleFormInput(event: InputEvent<HTMLFormElement>): void;
  handleImageChange(event: ChangeEvent<HTMLInputElement>): void;
  handleCropComplete(croppedArea: Area, croppedAreaPixels: Area): void;
  handleUseCrop(): Promise<void>;
  handleEditCrop(): void;
  handleDeleteImage(): Promise<void>;
  handleDelete(): Promise<void>;
};

const inputClass =
  "mt-1 block w-full rounded-lg border-[0.1rem] border-b-[0.2rem] border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50";

const labelClass = "font-medium text-gray-900";

export default function EditItemForm({
  canManage,
  handleSubmit,
  handleFormInput,
  isProcessing,
  itemData,
  imagePreview,
  cropImageSrc,
  crop,
  zoom,
  croppedAreaPixels,
  errorMessageImage,
  handleImageChange,
  setCrop,
  setZoom,
  handleCropComplete,
  handleUseCrop,
  handleEditCrop,
  handleDeleteImage,
  canSubmit,
  isSaving,
  isSynced,
  setIsSynced,
  hasSyncGroup,
  handleDelete,
  isDeleting,
}: EditItemFormParams) {
  if (!canManage) {
    return (
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900">Item info</h2>

          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-gray-600">Name</dt>
              <dd className="mt-1 text-gray-900">{itemData.name}</dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-900">
                {itemData.description ?? "No description provided."}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Contains</dt>
              <dd className="mt-1 text-gray-900">
                {itemData.containsList.length > 0
                  ? itemData.containsList.join(", ")
                  : "No ingredients listed."}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Calories</dt>
              <dd className="mt-1 text-gray-900">
                {itemData.calories !== null
                  ? `${itemData.calories} kcal`
                  : "Not provided"}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-gray-600">Price</dt>
              <dd className="mt-1 font-medium text-gray-900">
                ${Number(itemData.price).toFixed(2)}
              </dd>
            </div>
          </dl>

          <Divider />

          <h3 className="text-sm font-medium text-gray-900">Image</h3>
          <div className="mt-3">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt={`${itemData.name} image`}
                width={300}
                height={300}
                className="max-h-[300px] w-auto rounded-md object-contain"
              />
            ) : (
              <p className="text-sm text-gray-600">No image provided.</p>
            )}
          </div>

          <Divider />

          <h3 className="text-sm font-medium text-gray-900">Availability</h3>
          <p className="mt-1 text-sm text-gray-700">
            {itemData.isAvailable ? "Available" : "Unavailable"}
          </p>

          <p className="mt-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
            Display Order: {itemData.order}
          </p>
        </div>
      </section>
    );
  }

  return (
    <form
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <div className="p-5 sm:p-6">
        <fieldset disabled={isProcessing}>
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
                defaultValue={itemData.name}
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
                defaultValue={itemData.description ?? ""}
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
                defaultValue={itemData.containsList.join(", ")}
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
                defaultValue={itemData.calories ?? ""}
              />
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
                defaultValue={Number(itemData.price)}
                required
              />
            </div>
          </div>
        </fieldset>

        <Divider />

        <fieldset disabled={isProcessing}>
          <legend className="text-sm font-medium text-gray-900">Image</legend>

          <div className="mt-3">
            <label htmlFor="item-image" className={labelClass}>
              {itemData.imageKey ? "Replace image" : "Add image"}
            </label>
            <input
              className={inputClass}
              id="item-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
          </div>

          {cropImageSrc && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-900">Crop Image</p>
              <p className="mt-1 text-sm text-gray-600">
                Move and zoom the image to select the area you want to use.
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
                className="block rounded-lg disabled:cursor-default"
                aria-label="Edit image crop"
              >
                <Image
                  src={imagePreview}
                  alt={`${itemData.name} image preview`}
                  width={300}
                  height={300}
                  className="max-h-[300px] w-auto rounded-md object-contain transition-opacity hover:opacity-80"
                />
              </button>

              <p className="mt-2 text-sm text-gray-600">
                Click the image to adjust the crop.
              </p>
            </div>
          )}

          {errorMessageImage && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {errorMessageImage}
            </p>
          )}

          {itemData.imageKey && (
            <button
              className="mt-4 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={isProcessing}
              onClick={handleDeleteImage}
            >
              Delete Image
            </button>
          )}
        </fieldset>

        <Divider />

        <fieldset disabled={isProcessing}>
          <legend className="text-sm font-medium text-gray-900">
            Availability
          </legend>

          <label
            htmlFor="item-available"
            className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-900"
          >
            <input
              id="item-available"
              name="isAvailable"
              type="checkbox"
              defaultChecked={itemData.isAvailable}
              className="size-4 accent-blue-600"
            />
            Available?
          </label>
        </fieldset>

        <p className="mt-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          Display Order: {itemData.order}
        </p>

        {hasSyncGroup && (
          <>
            <Divider />
            <IsSyncedCheckbox
              hasSyncGroup={hasSyncGroup}
              htmlFor="sync-item"
              inputName="sync-item"
              isSynced={isSynced}
              setIsSynced={setIsSynced}
              isSaving={isSaving}
              description="Apply changes to synchronized copies across locations."
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 bg-gray-50 px-5 py-4 sm:px-6">
        <button
          className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          disabled={isProcessing}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete Item"}
        </button>

        <button
          className="rounded-lg border border-emerald-500 bg-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          type="submit"
          disabled={isProcessing || !canSubmit}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
