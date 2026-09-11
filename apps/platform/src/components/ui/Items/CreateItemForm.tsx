"use client";

import ChevronIcon from "@/components/icons/chevron";
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
import Image from "next/image";

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
      className="dashboard-card flex flex-col gap-5 p-4"
      onSubmit={handleSubmit}
      onInput={handleFormInput}
    >
      <fieldset disabled={isLoading || isCreating}>
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
          />
        </div>

        <div>
          <label htmlFor="item-image">Image</label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
          />

          {cropImageSrc && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Adjust the image crop below.
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
                  className="
                    rounded-lg
                    border border-blue-500
                    bg-blue-100
                    px-4 py-2
                    text-blue-900
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
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

              <p className="mt-2 text-sm text-gray-500">
                Select the image to adjust the crop.
              </p>
            </div>
          )}

          {errorMessageImage && (
            <p role="alert" className="mt-2">
              {errorMessageImage}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="item-price">
            Price (For items with options inside, set this item price to 0)
            <RequiredField />
          </label>

          <input
            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </div>
      </fieldset>

      <div>
        <p className="font-semibold">Display Order</p>

        <p>
          A lower order appear first on your website. You can reorder any item
          when viewing your items list with the{" "}
          <span className="inline-flex items-center align-middle">
            <ChevronIcon direction="up" size={20} />
          </span>{" "}
          or{" "}
          <span className="inline-flex items-center align-middle">
            <ChevronIcon direction="down" size={20} />
          </span>{" "}
          buttons.
        </p>
      </div>

      <p className="w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-400 bg-gray-100 px-3 py-2">
        Display Order: {latestOrder}
      </p>

      <IsSyncedCheckbox
        hasSyncGroup={hasSyncGroup}
        htmlFor={"sync-items"}
        inputName={"sync-items"}
        isSynced={isSynced}
        setIsSynced={setIsSynced}
        isSaving={isLoading || isCreating}
        description={
          "Creates this item for all locations in the same synced category."
        }
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button
        className="md:w-fit bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        type="submit"
        disabled={isCreating || isLoading || !canSubmit}
      >
        {isCreating ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
