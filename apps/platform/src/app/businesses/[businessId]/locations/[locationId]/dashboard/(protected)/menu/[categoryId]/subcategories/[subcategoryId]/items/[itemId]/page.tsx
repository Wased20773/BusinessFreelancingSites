"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { ItemJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChangeEvent,
  InputEvent,
  SubmitEvent,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import "../../../../../../page.css";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import {
  createItemImage,
  deleteItem,
  deleteItemImage,
  getItem,
  updateItem,
  updateItemImage,
} from "@/lib/api/items";
import {
  createItemOption,
  deleteItemOption,
  updateItemOption,
} from "@/lib/api/item-options";
import ItemOptionsForm from "@/components/ui/items/ItemOptionsForm";
import EditItemForm from "@/components/ui/items/EditItemForm";

export default function EditItemPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    subcategoryId: string;
    itemId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;
  const subcategoryId = params.subcategoryId;
  const itemId = params.itemId;

  const [itemData, setItemData] = useState<ItemJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState<boolean>(false);
  const [isCreatingOption, setIsCreatingOption] = useState<boolean>(false);
  const [isDeletingOption, setIsDeletingOption] = useState<boolean>(false);
  const [processingOptionId, setProcessingOptionId] = useState<string | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

  async function refreshItemData() {
    const refreshedItem = await getItem(businessId, locationId, itemId);

    setItemData(refreshedItem);
    setImagePreview(refreshedItem.imageKey ?? null);
  }

  useEffect(() => {
    async function getItemData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const itemToast = toast.promise<ItemJson>(
          getItem(businessId, locationId, itemId),
          {
            loading: "Loading item...",
            success: "Item loaded.",

            error: (error) => {
              if (axios.isAxiosError(error)) {
                return {
                  message: "Failed to load item.",
                  description: `Status code: ${
                    error.response?.status ?? "No response"
                  }`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the item.",
              };
            },
          },
        );

        const selectedItem = await itemToast.unwrap();

        setItemData(selectedItem);
        setIsSynced(selectedItem.isSynced);
        setHasSyncGroup(Boolean(selectedItem.syncGroupId));
        setImagePreview(selectedItem.imageKey ?? null);
        setCanSubmit(
          Boolean(selectedItem.name.trim() && selectedItem.price !== null),
        );
      } catch (error) {
        console.error("Error in Edit Item page:", error);
        setErrorMessage("Failed to load item data.");
      } finally {
        setIsLoading(false);
      }
    }

    void getItemData();
  }, [businessId, locationId, itemId]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const price = formData.get("price");

    const hasName = typeof name === "string" && name.trim() !== "";
    const hasPrice = typeof price === "string" && price.trim() !== "";

    setCanSubmit(hasName && hasPrice);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setImagePreview(itemData?.imageKey ?? null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  }

  // ----------------------------
  // ITEM UPDATE
  // ----------------------------

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const description = formData.get("description");

    const containsList = formData.get("containsList");
    const calories = formData.get("calories");
    const price = formData.get("price");
    const isAvailable = formData.get("isAvailable");
    const image = formData.get("image");

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
      containsList:
        typeof containsList === "string" && containsList.trim()
          ? containsList
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
          : [],
      calories:
        typeof calories === "string" && calories !== ""
          ? Number(calories)
          : null,
      price: typeof price === "string" && price !== "" ? Number(price) : 0,
      isAvailable: isAvailable !== null,
      isSynced,
    };

    if (!requestBody.name) {
      setErrorMessage("An item name is required.");
      return;
    }

    if (requestBody.price === null || Number.isNaN(requestBody.price)) {
      setErrorMessage("An item price is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateItemRequest = async (): Promise<ItemJson> => {
        const updatedItem = await updateItem(
          businessId,
          locationId,
          itemId,
          requestBody,
        );

        // Images use their own route
        if (image instanceof File && image.size > 0) {
          const imageFormData = new FormData();
          imageFormData.append("image", image);

          setIsUpdatingImage(true);

          try {
            // Existing image -> replace it
            if (itemData?.imageKey) {
              await updateItemImage(
                businessId,
                locationId,
                itemId,
                image,
                isSynced,
              );
            } else {
              // No image -> create the first image
              await createItemImage(
                businessId,
                locationId,
                itemId,
                image,
                isSynced,
              );
            }
          } finally {
            setIsUpdatingImage(false);
          }
        }

        return updatedItem;
      };

      const updateToast = toast.promise<ItemJson>(updateItemRequest(), {
        loading: "Updating item...",
        success: "Item updated.",

        error: (error) => {
          if (axios.isAxiosError(error)) {
            return {
              message: "Failed to update item.",
              description: `Status code: ${
                error.response?.status ?? "No response"
              }`,
            };
          }

          return {
            message: "Unexpected error.",
            description: "Something went wrong while updating the item.",
          };
        },
      });

      await updateToast.unwrap();

      // Refetch so imageKey contains a new presigned URL
      await refreshItemData();
    } catch (error) {
      console.error("Error updating item:", error);

      setErrorMessage("Failed to update the item.");
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------
  // ITEM IMAGE DELETE
  // ----------------------------

  async function handleDeleteImage() {
    if (!itemData?.imageKey) return;

    setIsUpdatingImage(true);
    setErrorMessage(null);

    try {
      const imageToast = toast.promise(
        deleteItemImage(businessId, locationId, itemId, isSynced),
        {
          loading: "Deleting image...",
          success: "Image deleted.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to delete image.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the image.",
            };
          },
        },
      );

      await imageToast.unwrap();

      setItemData((currentItem) =>
        currentItem
          ? {
              ...currentItem,
              imageKey: null,
            }
          : null,
      );

      setImagePreview(null);
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
      const deleteToast = toast.promise(
        deleteItem(businessId, locationId, itemId, isSynced),
        {
          loading: "Deleting item...",
          success: "Item deleted.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to delete item.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the item.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`,
      );
    } catch (error) {
      console.error("Error deleting item:", error);

      setErrorMessage("Failed to delete the item.");
    } finally {
      setIsDeleting(false);
    }
  }

  // ----------------------------
  // CREATE ITEM OPTION
  // ----------------------------

  async function handleCreateOption(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const price = formData.get("price");
    const optionIsSynced = Boolean(formData.get("sync-item-option"));

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",
      price: typeof price === "string" && price !== "" ? Number(price) : 0,
      isSynced: optionIsSynced,
    };

    if (!requestBody.name) {
      setErrorMessage("An option name is required.");
      return;
    }

    if (requestBody.price === null || Number.isNaN(requestBody.price)) {
      setErrorMessage("An option price is required.");
      return;
    }

    setIsCreatingOption(true);
    setErrorMessage(null);

    try {
      const optionToast = toast.promise(
        createItemOption(businessId, locationId, itemId, requestBody),
        {
          loading: "Creating option...",
          success: "Option created.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to create option.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the option.",
            };
          },
        },
      );

      await optionToast.unwrap();

      form.reset();

      await refreshItemData();
    } catch (error) {
      console.error("Error creating option:", error);
      setErrorMessage("Failed to create the option.");
    } finally {
      setIsCreatingOption(false);
    }
  }

  // ----------------------------
  // UPDATE ITEM OPTION
  // ----------------------------

  async function handleUpdateOption(
    event: SubmitEvent<HTMLFormElement>,
    optionId: string,
  ) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const price = formData.get("price");
    const isAvailable = formData.get("isAvailable");
    const optionIsSynced = Boolean(formData.get("sync-item-option"));

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",
      price: typeof price === "string" && price !== "" ? Number(price) : 0,
      isAvailable: isAvailable !== null,
      isSynced: optionIsSynced,
    };

    if (!requestBody.name) {
      setErrorMessage("An option name is required.");
      return;
    }

    if (requestBody.price === null || Number.isNaN(requestBody.price)) {
      setErrorMessage("An option price is required.");
      return;
    }

    setProcessingOptionId(optionId);
    setErrorMessage(null);

    try {
      const optionToast = toast.promise(
        updateItemOption(businessId, locationId, itemId, optionId, requestBody),
        {
          loading: "Updating option...",
          success: "Option updated.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to update option.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the option.",
            };
          },
        },
      );

      await optionToast.unwrap();
      await refreshItemData();
    } catch (error) {
      console.error("Error updating option:", error);
      setErrorMessage("Failed to update the option.");
    } finally {
      setProcessingOptionId(null);
    }
  }

  // ----------------------------
  // DELETE ITEM OPTION
  // ----------------------------

  async function handleDeleteOption(
    event: React.MouseEvent<HTMLButtonElement>,
    optionId: string,
  ) {
    setProcessingOptionId(optionId);
    setIsDeletingOption(true);
    setErrorMessage(null);

    const form = event.currentTarget.form;

    if (!form) {
      setErrorMessage("A form could not be found when attempting to delete.");
      return;
    }

    const formData = new FormData(form);

    const deleteAllSynced = Boolean(formData.get("sync-item-option"));

    try {
      const optionToast = toast.promise(
        deleteItemOption(
          businessId,
          locationId,
          itemId,
          optionId,
          deleteAllSynced,
        ),
        {
          loading: "Deleting option...",
          success: "Option deleted.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to delete option.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the option.",
            };
          },
        },
      );

      await optionToast.unwrap();
      await refreshItemData();
    } catch (error) {
      console.error("Error deleting option:", error);
      setErrorMessage("Failed to delete the option.");
    } finally {
      setProcessingOptionId(null);
      setIsDeletingOption(false);
    }
  }

  // ----------------------------
  // MOVE ITEM OPTION
  // ----------------------------
  async function handleMoveOption(
    optionId: string,
    direction: ReorderDirection,
  ) {
    setProcessingOptionId(optionId);

    try {
      const moveToast = toast.promise(
        moveOrder({
          context: "itemOption",
          businessId,
          locationId,
          direction,
          itemId,
          optionId,
        }),
        {
          loading:
            direction === "up" ? "Moving option up" : "Moving option down",
          success: "Option order updated.",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to move option.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while moving the option.",
            };
          },
        },
      );

      await moveToast.unwrap();
      await refreshItemData();
    } catch (error) {
      console.error("Error moving option:", error);
    } finally {
      setProcessingOptionId(null);
    }
  }

  if (isLoading) {
    return <p>Loading item...</p>;
  }

  if (errorMessage && !itemData) {
    return <p role="alert">{errorMessage}</p>;
  }

  if (!itemData) {
    return <p>This item could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting || isUpdatingImage;

  const options = itemData.options ?? [];

  return (
    <section aria-labelledby="edit-item-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`}
          aria-label="Return to subcategory"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-item-heading">Edit Item</h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* ITEM FORM */}
        <EditItemForm
          itemData={itemData}
          imagePreview={imagePreview}
          canSubmit={canSubmit}
          isProcessing={isProcessing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          hasSyncGroup={hasSyncGroup}
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleImageChange={handleImageChange}
          handleDeleteImage={handleDeleteImage}
          handleDelete={handleDelete}
        />

        {/* ITEM OPTION FORM */}
        <ItemOptionsForm
          options={options}
          processingOptionId={processingOptionId}
          isCreatingOption={isCreatingOption}
          createOptionIsSynced={Boolean(itemData.syncGroupId)}
          hasSyncGroup={hasSyncGroup}
          isDeletingOption={isDeletingOption}
          handleCreateOption={handleCreateOption}
          handleUpdateOption={handleUpdateOption}
          setCreateOptionIsSynced={setIsCreatingOption}
          handleMoveOption={handleMoveOption}
          handleDeleteOption={handleDeleteOption}
        />
      </div>
    </section>
  );
}
