"use client";

import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import CreateItemForm from "@/components/ui/items/CreateItemForm";
import ItemOptionsEditor from "@/components/ui/items/ItemOptionsEditor";
import { useItemImage } from "@/components/ui/items/useItemImage";
import { createItem, createItemImage } from "@/lib/api/items";
import { requestError } from "@/lib/api/requestError";
import { draftsToPayload, type OptionDraft } from "@/lib/items/optionDrafts";
import { readItemFields } from "@/lib/items/readItemFields";
import { ACCESS_LEVEL, type ItemJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type CreateItemViewProps = {
  businessId: string;
  locationId: string;
  // The category (or subcategory) the item goes into.
  categoryId: string;
  // Where "back" and a successful create go.
  backPath: string;
  backLabel: string;
};

type MenuCategory = {
  id: string;
  isSynced: boolean;
  syncGroupId: string | null;
  items: ItemJson[];
  subcategories?: MenuCategory[];
};

/*
 *   Create Item page, for a category or a subcategory. The item and all
 *   its options are created in one request; the image is uploaded after.
 **/
export default function CreateItemView({
  businessId,
  locationId,
  categoryId,
  backPath,
  backLabel,
}: CreateItemViewProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(1);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);
  const [optionDrafts, setOptionDrafts] = useState<OptionDraft[]>([]);

  const itemImage = useItemImage();

  const currentAccessLevel = session?.user?.accessLevel;
  const canCreateItem =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  // The category's sync settings and the next display order.
  useEffect(() => {
    async function loadCategory() {
      setIsLoading(true);

      try {
        const response = await axios.get<{ categories: MenuCategory[] }>(
          "/api/business/menu",
          {
            headers: {
              "x-business-id": businessId,
              "x-location-id": locationId,
            },
          },
        );

        const category = response.data.categories
          .flatMap((topLevel) => [topLevel, ...(topLevel.subcategories ?? [])])
          .find((candidate) => candidate.id === categoryId);

        if (!category) {
          toast.error("The selected category does not exist in our records.");
          return;
        }

        setHasSyncGroup(Boolean(category.syncGroupId));
        setIsSynced(category.isSynced);

        if (category.items.length > 0) {
          setLatestOrder(
            Math.max(...category.items.map((item) => item.order)) + 1,
          );
        }
      } catch (error) {
        console.error("Failed to load the category:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canCreateItem) {
      void loadCategory();
    }
  }, [businessId, locationId, categoryId, status, canCreateItem]);

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

    setIsCreating(true);

    const { image, selectedImage } = itemImage;

    try {
      const created = await toast
        .promise(
          createItem(businessId, locationId, categoryId, {
            ...item.fields,
            isSynced,
            options: options.options,
          }),
          {
            loading: "Creating item...",
            success: "Item created.",
            error: requestError("Failed to create item."),
          },
        )
        .unwrap();

      // The item exists now; the image is a separate upload.
      if (image && image.size > 0 && selectedImage && selectedImage.size > 0) {
        try {
          await createItemImage(
            businessId,
            locationId,
            created.id,
            image,
            isSynced,
            selectedImage,
          );
        } catch (error) {
          console.error("Item created, but image upload failed:", error);
          toast.error(
            axios.isAxiosError<{ error?: string }>(error)
              ? (error.response?.data?.error ??
                  "Item created, but image upload failed.")
              : "Item created, but image upload failed.",
          );
        }
      }

      itemImage.clearImage();
      router.push(backPath);
    } catch (error) {
      console.error("Error creating item:", error);
      setErrorMessage(
        axios.isAxiosError<{ error?: string }>(error)
          ? (error.response?.data?.error ?? "Failed to create the item.")
          : "Failed to create the item.",
      );
      setIsCreating(false);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canCreateItem,
    pageTitle: "Menu",
    reason: "Your current access level does not allow item creation.",
  });

  if (pageState) return pageState;

  return (
    <section
      aria-labelledby="create-item-heading"
      className="mx-auto max-w-[1000px] p-5 pt-0"
    >
      <PageHeading
        path={backPath}
        ariaLabel={backLabel}
        setIsLoading={setIsLoading}
        headingId="create-item-heading"
        heading="Create Item"
      />

      <div className="mt-[0.5rem]">
        <CreateItemForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          isCreating={isCreating}
          errorMessage={errorMessage}
          errorMessageImage={itemImage.errorMessageImage}
          canSubmit={canSubmit}
          latestOrder={latestOrder}
          hasSyncGroup={hasSyncGroup}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          imagePreview={itemImage.imagePreview}
          cropImageSrc={itemImage.cropImageSrc}
          crop={itemImage.crop}
          zoom={itemImage.zoom}
          croppedAreaPixels={itemImage.croppedAreaPixels}
          handleImageChange={(event) => itemImage.handleImageChange(event)}
          setCrop={itemImage.setCrop}
          setZoom={itemImage.setZoom}
          handleCropComplete={itemImage.handleCropComplete}
          handleUseCrop={itemImage.handleUseCrop}
          handleEditCrop={itemImage.handleEditCrop}
          options={
            <ItemOptionsEditor
              canManage
              drafts={optionDrafts}
              setDrafts={setOptionDrafts}
              disabled={isLoading || isCreating}
            />
          }
        />
      </div>
    </section>
  );
}
