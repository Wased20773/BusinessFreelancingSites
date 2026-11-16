"use client";

import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import FormPageSkeleton from "@/components/ui/FormPageSkeleton";
import { motion } from "motion/react";
import { fadeInMotion } from "@/components/motion/listMotion";
import EditItemForm from "@/components/ui/items/EditItemForm";
import ItemOptionsEditor from "@/components/ui/items/ItemOptionsEditor";
import AddOnPicker from "@/components/ui/items/AddOnPicker";
import ItemAddOnsSection from "@/components/ui/items/ItemAddOnsSection";
import { useItemAddOns } from "@/components/ui/items/useItemAddOns";
import { useItemImage } from "@/components/ui/items/useItemImage";
import {
  createItemImage,
  deleteItem,
  deleteItemImage,
  getItem,
  updateItem,
  updateItemImage,
} from "@/lib/api/items";
import { requestError } from "@/lib/api/requestError";
import {
  draftsFromOptions,
  draftsToPayload,
  type AddOnLinkDraft,
  type OptionDraft,
} from "@/lib/items/optionDrafts";
import { readItemFields } from "@/lib/items/readItemFields";
import { ACCESS_LEVEL, type ItemJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import Divider from "@/components/layout/Divider";

type EditItemViewProps = {
  businessId: string;
  locationId: string;
  itemId: string;
  // Where "back" and a delete go.
  backPath: string;
  backLabel: string;
};

/*
 *   Edit Item page, for an item in a category or a subcategory. One Save
 *   sends the item and its full option list together (one transaction);
 *   a new image is uploaded after.
 **/
export default function EditItemView({
  businessId,
  locationId,
  itemId,
  backPath,
  backLabel,
}: EditItemViewProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [itemData, setItemData] = useState<ItemJson | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>([]);

  // isFetching: the item is loading (shows the form skeleton).
  // isLoading: a link was clicked and the next page is opening.
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState<boolean>(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

  const itemImage = useItemImage();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageItem =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const canViewItem =
    canManageItem || currentAccessLevel === ACCESS_LEVEL.staff;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  const addOns = useItemAddOns(
    businessId,
    locationId,
    status === "authenticated" && canViewItem,
  );

  // One option's picked add-ons (used when add-ons vary by option).
  function setOptionAddOns(key: string, next: AddOnLinkDraft[]) {
    setOptionDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, addOns: next } : draft,
      ),
    );
  }

  // Shows a freshly loaded item: its fields, options, add-ons, and image.
  function showItem(item: ItemJson, keepOriginalImage = false) {
    setItemData(item);
    setOptionDrafts(draftsFromOptions(item.options ?? []));
    addOns.showSaved(item);
    itemImage.showSavedImage(
      item.imageKey ?? null,
      item.originalImageKey ?? null,
      keepOriginalImage,
    );
  }

  useEffect(() => {
    async function loadItem() {
      setIsFetching(true);
      setLoadError(null);

      try {
        const item = await toast
          .promise(getItem(businessId, locationId, itemId), {
            loading: "Loading item...",
            success: "Item loaded.",
            error: requestError("Failed to load item."),
          })
          .unwrap();

        showItem(item);
        setIsSynced(item.isSynced);
        setHasSyncGroup(Boolean(item.syncGroupId));
        setCanSubmit(Boolean(item.name.trim()));
      } catch (error) {
        console.error("Error loading item:", error);
        setLoadError("Failed to load item data.");
      } finally {
        setIsFetching(false);
      }
    }

    if (status === "authenticated" && canViewItem) {
      void loadItem();
    }
    // showItem only sets state; loading again when it changes isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, locationId, itemId, status, canViewItem]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");
    const price = formData.get("price");

    setCanSubmit(
      typeof name === "string" &&
        name.trim() !== "" &&
        typeof price === "string" &&
        price.trim() !== "",
    );
  }

  // ----------------------------
  // SAVE: item + every option together, then the image
  // ----------------------------

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const item = readItemFields(event.currentTarget);

    if ("error" in item) {
      setErrorMessage(item.error);
      return;
    }

    const options = draftsToPayload(optionDrafts);

    if ("error" in options) {
      setErrorMessage(options.error);
      return;
    }

    const addOnFields = addOns.toPayload();

    if ("error" in addOnFields) {
      setErrorMessage(addOnFields.error);
      return;
    }

    setIsSaving(true);

    const { image, selectedImage } = itemImage;
    const hadImage = Boolean(itemData?.imageKey);

    try {
      await toast
        .promise(
          (async () => {
            await updateItem(businessId, locationId, itemId, {
              ...item.fields,
              isSynced,
              options: options.options,
              ...addOnFields,
            });

            // Images use their own route.
            if (image && image.size > 0) {
              setIsUpdatingImage(true);

              try {
                const upload = hadImage ? updateItemImage : createItemImage;

                await upload(
                  businessId,
                  locationId,
                  itemId,
                  image,
                  isSynced,
                  selectedImage,
                );
              } finally {
                setIsUpdatingImage(false);
              }
            }
          })(),
          {
            loading: "Saving item...",
            success: "Item saved.",
            error: requestError("Failed to save item."),
          },
        )
        .unwrap();

      // Reload: new option ids, and a fresh presigned image URL.
      showItem(
        await getItem(businessId, locationId, itemId),
        Boolean(selectedImage),
      );
    } catch (error) {
      console.error("Error saving item:", error);
      setErrorMessage(
        axios.isAxiosError<{ error?: string }>(error)
          ? (error.response?.data?.error ?? "Failed to save the item.")
          : "Failed to save the item.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------
  // IMAGE DELETE
  // ----------------------------

  async function handleDeleteImage() {
    if (!itemData?.imageKey) return;

    setIsUpdatingImage(true);
    setErrorMessage(null);

    try {
      await toast
        .promise(deleteItemImage(businessId, locationId, itemId, isSynced), {
          loading: "Deleting image...",
          success: "Image deleted.",
          error: requestError("Failed to delete image."),
        })
        .unwrap();

      setItemData((current) =>
        current ? { ...current, imageKey: null, originalImageKey: null } : null,
      );
      itemImage.clearImage();
    } catch (error) {
      console.error("Error deleting item image:", error);
      setErrorMessage("Failed to delete the item image.");
    } finally {
      setIsUpdatingImage(false);
    }
  }

  // ----------------------------
  // ITEM DELETE
  // ----------------------------

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await toast
        .promise(deleteItem(businessId, locationId, itemId, isSynced), {
          loading: "Deleting item...",
          success: "Item deleted.",
          error: requestError("Failed to delete item."),
        })
        .unwrap();

      router.push(backPath);
    } catch (error) {
      console.error("Error deleting item:", error);
      setErrorMessage("Failed to delete the item.");
      setIsDeleting(false);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewItem,
    pageTitle: "Menu",
    reason: "Your current access level does not include item access.",
  });

  if (pageState) return pageState;

  if (isFetching) {
    return (
      <FormPageSkeleton
        label="Loading item"
        fields={[
          "input",
          "textarea",
          "input",
          "input",
          "input",
          "image",
          "checkbox",
          "rows",
        ]}
        showDelete={canManageItem}
      />
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="p-5">
        {loadError}
      </p>
    );
  }

  if (!itemData) {
    return <p className="p-5">This item could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting || isUpdatingImage;

  return (
    <motion.section
      {...fadeInMotion}
      aria-labelledby="edit-item-heading"
      className="relative mx-auto max-w-[1000px]"
    >
      <PageHeading
        path={backPath}
        ariaLabel={backLabel}
        setIsLoading={setIsLoading}
        headingId="edit-item-heading"
        heading="Go Back"
      />

      <div className="p-5 pt-0">
        {errorMessage && (
          <p
            role="alert"
            className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-6">
          <EditItemForm
            canManage={canManageItem}
            itemData={itemData}
            imagePreview={itemImage.imagePreview}
            cropImageSrc={itemImage.cropImageSrc}
            crop={itemImage.crop}
            zoom={itemImage.zoom}
            croppedAreaPixels={itemImage.croppedAreaPixels}
            errorMessageImage={itemImage.errorMessageImage}
            canSubmit={canSubmit}
            isProcessing={isProcessing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            isSynced={isSynced}
            setIsSynced={setIsSynced}
            hasSyncGroup={hasSyncGroup}
            handleSubmit={handleSubmit}
            handleFormInput={handleFormInput}
            handleImageChange={(event) =>
              itemImage.handleImageChange(event, itemData.imageKey ?? null)
            }
            setCrop={itemImage.setCrop}
            setZoom={itemImage.setZoom}
            handleCropComplete={itemImage.handleCropComplete}
            handleUseCrop={itemImage.handleUseCrop}
            handleEditCrop={itemImage.handleEditCrop}
            handleDeleteImage={handleDeleteImage}
            handleDelete={handleDelete}
            options={
              <>
                <ItemOptionsEditor
                  canManage={canManageItem}
                  drafts={optionDrafts}
                  setDrafts={setOptionDrafts}
                  disabled={isProcessing}
                  renderOptionExtras={
                    addOns.varyByOption
                      ? (draft) => (
                          <AddOnPicker
                            idPrefix={`option-${draft.key}`}
                            groups={addOns.groups}
                            value={draft.addOns}
                            onChange={(next) =>
                              setOptionAddOns(draft.key, next)
                            }
                            canManage={canManageItem}
                            disabled={isProcessing}
                          />
                        )
                      : undefined
                  }
                />

                <Divider />

                <ItemAddOnsSection
                  groups={addOns.groups}
                  groupsError={addOns.groupsError}
                  addOnsHref={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/add-ons`}
                  varyByOption={addOns.varyByOption}
                  setVaryByOption={addOns.setVaryByOption}
                  itemAddOns={addOns.itemAddOns}
                  setItemAddOns={addOns.setItemAddOns}
                  optionDrafts={optionDrafts}
                  canManage={canManageItem}
                  disabled={isProcessing}
                />
              </>
            }
          />
        </div>
      </div>
    </motion.section>
  );
}
