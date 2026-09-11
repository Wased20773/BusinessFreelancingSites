"use client";

import { ItemJson } from "@/types/types";
import Image from "next/image";
import {
  ChangeEvent,
  Dispatch,
  InputEvent,
  SetStateAction,
  SubmitEvent,
} from "react";
import RequiredField from "../RequiredField";
import IsSyncedCheckbox from "../IsSyncedCheckbox";
import Cropper, { type Area, type Point } from "react-easy-crop";

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
      <section className="dashboard-card flex flex-col gap-5 p-4">
        <fieldset>
          <legend>Item info</legend>

          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium mt-1">{itemData.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Description</p>

            <p className="mt-1">
              {itemData.description ?? "No description provided."}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Contains</p>

            <p className="mt-1">
              {itemData.containsList.length > 0
                ? itemData.containsList.join(", ")
                : "No ingredients listed."}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Calories</p>

            <p className="mt-1">
              {itemData.calories !== null
                ? `${itemData.calories} kcal`
                : "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Price</p>

            <p className="font-medium mt-1">
              ${Number(itemData.price).toFixed(2)}
            </p>
          </div>
        </fieldset>

        <fieldset className="flex items-start">
          <legend>Image</legend>

          {imagePreview ? (
            <Image
              src={imagePreview}
              alt={`${itemData.name} image`}
              width={300}
              height={300}
              className="max-h-[300px] w-auto rounded-md object-contain"
            />
          ) : (
            <p className="text-gray-500">No image provided.</p>
          )}
        </fieldset>

        <fieldset>
          <legend>Availability</legend>

          <p>{itemData.isAvailable ? "Available" : "Unavailable"}</p>
        </fieldset>

        <p className="w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-400 bg-gray-100 px-3 py-2">
          Display Order: {itemData.order}
        </p>
      </section>
    );
  }
  return (
    <form
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isProcessing}>
        <legend>Item info</legend>

        <div>
          <label htmlFor="item-name">
            Name
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-name"
            name="name"
            type="text"
            defaultValue={itemData.name}
            required
          />
        </div>

        <div>
          <label htmlFor="item-description">Description</label>

          <textarea
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-description"
            name="description"
            rows={4}
            defaultValue={itemData.description ?? ""}
          />
        </div>

        <div>
          <label htmlFor="item-contains">
            What does the item contain? Please separate with a comma.
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-contains"
            name="containsList"
            type="text"
            defaultValue={itemData.containsList.join(", ")}
            placeholder="pepper, salt, onions ..."
          />
        </div>

        <div>
          <label htmlFor="item-calories">Calories (kcal)</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-calories"
            name="calories"
            type="number"
            min="0"
            step="5"
            defaultValue={itemData.calories ?? ""}
          />
        </div>

        <div>
          <label htmlFor="item-price">
            Price
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(itemData.price)}
            required
          />
        </div>
      </fieldset>

      <fieldset disabled={isProcessing}>
        <legend>Image</legend>

        <div>
          <label htmlFor="item-image">
            {itemData.imageKey ? "Replace image" : "Add image"}
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />
        </div>

        {cropImageSrc && (
          <div className="mt-4">
            <p className="font-semibold">Crop Image</p>

            <p className="text-sm text-gray-500 mt-1">
              Move and zoom the image to select the area you want to use.
            </p>

            <div className="relative w-full h-[400px] mt-3 rounded-lg overflow-hidden bg-black">
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

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => void handleUseCrop()}
                disabled={!croppedAreaPixels}
                className="rounded-lg border border-blue-500 bg-blue-100 px-4 py-2 text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {!cropImageSrc && imagePreview && (
          <>
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

              <p className="text-sm text-gray-500 mt-2">
                Click the image to adjust the crop.
              </p>
            </div>
          </>
        )}

        {errorMessageImage && (
          <p role="alert" className="mt-3 text-red-600">
            {errorMessageImage}
          </p>
        )}

        {itemData.imageKey && (
          <button
            className="w-fit border-[0.1rem] border-gray-500 rounded-md text-gray-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={isProcessing}
            onClick={handleDeleteImage}
          >
            Delete Image
          </button>
        )}
      </fieldset>

      <fieldset disabled={isProcessing}>
        <legend>Availability</legend>

        <label htmlFor="item-available" className="cursor-pointer">
          <input
            className="mr-2"
            id="item-available"
            name="isAvailable"
            type="checkbox"
            defaultChecked={itemData.isAvailable}
          />
          Available?
        </label>
      </fieldset>

      <p className="w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-400 bg-gray-100 px-3 py-2">
        Display Order: {itemData.order}
      </p>

      <IsSyncedCheckbox
        hasSyncGroup={hasSyncGroup}
        htmlFor={"sync-item"}
        inputName={"sync-item"}
        isSynced={isSynced}
        setIsSynced={setIsSynced}
        isSaving={isSaving}
        description={"Apply changes to synchronized copies across locations."}
      />

      <button
        className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="submit"
        disabled={isProcessing || !canSubmit}
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      <button
        className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        disabled={isProcessing}
        onClick={handleDelete}
      >
        {isDeleting ? "Deleting..." : "Delete Item"}
      </button>
    </form>
  );
}
