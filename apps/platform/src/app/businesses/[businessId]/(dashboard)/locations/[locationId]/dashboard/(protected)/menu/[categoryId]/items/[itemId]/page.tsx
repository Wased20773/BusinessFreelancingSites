"use client";

import EditItemForm from "@/components/ui/items/EditItemForm";
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
import { moveOrder, type ReorderDirection } from "@/lib/api/reorder";
import { ACCESS_LEVEL, type ItemJson } from "@/types/types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import {
  ChangeEvent,
  InputEvent,
  SubmitEvent,
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";
import "../../../../page.css";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import ItemOptionsForm from "@/components/ui/items/ItemOptionsForm";
import PageHeading from "@/components/ui/PageHeader";
import type { Area, Point } from "react-easy-crop";

export default function EditItemPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    itemId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;
  const itemId = params.itemId;

  const [itemData, setItemData] = useState<ItemJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeletingOption, setIsDeletingOption] = useState<boolean>(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState<boolean>(false);
  const [isCreatingOption, setIsCreatingOption] = useState<boolean>(false);
  const [processingOptionId, setProcessingOptionId] = useState<string | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMessageImage, setErrorMessageImage] = useState<string | null>(
    null,
  );
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

  // For Cropping
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;

  const canManageItem =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const canViewItem =
    canManageItem || currentAccessLevel === ACCESS_LEVEL.staff;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  async function refreshItemData(preserveOriginalImage = false) {
    const refreshedItem = await getItem(businessId, locationId, itemId);

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setItemData(refreshedItem);
    setImagePreview(refreshedItem.imageKey ?? null);

    if (!preserveOriginalImage) {
      if (originalImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(originalImageSrc);
      }

      setOriginalImageSrc(
        refreshedItem.originalImageKey ?? refreshedItem.imageKey ?? null,
      );
    }
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
        setOriginalImageSrc(
          selectedItem.originalImageKey ?? selectedItem.imageKey ?? null,
        );
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

    if (status === "authenticated" && canViewItem) {
      void getItemData();
    }
  }, [businessId, locationId, itemId, status, canViewItem]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const price = formData.get("price");

    const hasName = typeof name === "string" && name.trim() !== "";
    const hasPrice = typeof price === "string" && price.trim() !== "";

    setCanSubmit(hasName && hasPrice);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (cropImageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
    }

    if (
      originalImageSrc?.startsWith("blob:") &&
      originalImageSrc !== cropImageSrc
    ) {
      URL.revokeObjectURL(originalImageSrc);
    }

    const imageUrl = URL.createObjectURL(selectedFile);

    setImage(null);
    setImagePreview(itemData?.imageKey ?? null);
    setSelectedImage(selectedFile);
    setOriginalImageSrc(imageUrl);
    setCropImageSrc(imageUrl);

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);
    setCroppedAreaPixels(null);
    setErrorMessageImage(null);
  }

  function handleCropComplete(_croppedArea: Area, croppedAreaPixels: Area) {
    setCroppedAreaPixels(croppedAreaPixels);
  }

  async function createCroppedImage(
    imageSrc: string,
    cropArea: Area,
    originalFile: File | null,
  ): Promise<File> {
    const sourceImage = document.createElement("img");

    sourceImage.crossOrigin = "anonymous";
    sourceImage.src = imageSrc;

    await new Promise<void>((resolve, reject) => {
      sourceImage.onload = () => resolve();
      sourceImage.onerror = () => reject(new Error("Failed to load image."));
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create image canvas.");
    }

    /*
     * Use the crop's actual pixel dimensions.
     * We are not forcing the Item image into a fixed size.
     */
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    context.drawImage(
      sourceImage,

      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,

      0,
      0,
      cropArea.width,
      cropArea.height,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to crop image."));
          }
        },

        originalFile?.type ?? "image/webp",

        0.95,
      );
    });

    const imageType = originalFile?.type ?? "image/webp";

    return new File([blob], originalFile?.name ?? "item-image.webp", {
      type: imageType,
    });
  }

  async function handleUseCrop() {
    if (!cropImageSrc || !croppedAreaPixels) {
      return;
    }

    try {
      const croppedImage = await createCroppedImage(
        cropImageSrc,
        croppedAreaPixels,
        selectedImage,
      );

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setImage(croppedImage);
      setImagePreview(URL.createObjectURL(croppedImage));
      setCropImageSrc(null);
      setErrorMessageImage(null);
    } catch (error) {
      console.error("Error cropping item image:", error);

      setErrorMessageImage(
        "Something went wrong while cropping the item image.",
      );
    }
  }

  function handleEditCrop() {
    if (!originalImageSrc) {
      return;
    }

    setCropImageSrc(originalImageSrc);
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

        /*
         * Images use their own route.
         */
        if (image instanceof File && image.size > 0) {
          setIsUpdatingImage(true);

          try {
            /*
             * Existing image -> replace it.
             */
            if (itemData?.imageKey) {
              await updateItemImage(
                businessId,
                locationId,
                itemId,
                image,
                isSynced,
                selectedImage,
              );
            } else {
              /*
               * No image -> create the first image.
               */
              await createItemImage(
                businessId,
                locationId,
                itemId,
                image,
                isSynced,
                selectedImage,
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

      /*
       * Refetch so imageKey contains a
       * new presigned URL.
       */
      const refreshedItem = await getItem(businessId, locationId, itemId);

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setItemData(refreshedItem);

      setImage(null);
      setSelectedImage(null);
      setCropImageSrc(null);

      setImagePreview(refreshedItem.imageKey ?? null);

      setOriginalImageSrc(
        selectedImage
          ? originalImageSrc
          : (refreshedItem.originalImageKey ?? refreshedItem.imageKey ?? null),
      );
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
              originalImageKey: null,
            }
          : null,
      );

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      if (cropImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrc);
      }

      if (
        originalImageSrc?.startsWith("blob:") &&
        originalImageSrc !== cropImageSrc
      ) {
        URL.revokeObjectURL(originalImageSrc);
      }

      setImage(null);
      setSelectedImage(null);
      setCropImageSrc(null);
      setOriginalImageSrc(null);
      setImagePreview(null);
      setCroppedAreaPixels(null);
      setErrorMessageImage(null);
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
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`,
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
      setProcessingOptionId(null);
      setIsDeletingOption(false);
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

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewItem,
    pageTitle: "Menu",
    reason: "Your current access level does not include item access.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!itemData) {
    return <p className="p-5">This item could not be found.</p>;
  }

  const options = itemData.options ?? [];

  const isProcessing = isSaving || isDeleting || isUpdatingImage;

  return (
    <section
      aria-labelledby="edit-item-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
        ariaLabel="Return to category"
        setIsLoading={setIsLoading}
        headingId="edit-item-heading"
        heading={canManageItem ? "Edit Item" : "Item"}
      />

      <div className="mt-[0.5rem]">
        {/* ITEM FORM */}
        <EditItemForm
          canManage={canManageItem}
          itemData={itemData}
          imagePreview={imagePreview}
          cropImageSrc={cropImageSrc}
          crop={crop}
          zoom={zoom}
          croppedAreaPixels={croppedAreaPixels}
          errorMessageImage={errorMessageImage}
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
          setCrop={setCrop}
          setZoom={setZoom}
          handleCropComplete={handleCropComplete}
          handleUseCrop={handleUseCrop}
          handleEditCrop={handleEditCrop}
          handleDeleteImage={handleDeleteImage}
          handleDelete={handleDelete}
        />

        {/* ITEM OPTION FORM */}
        <ItemOptionsForm
          canManage={canManageItem}
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
