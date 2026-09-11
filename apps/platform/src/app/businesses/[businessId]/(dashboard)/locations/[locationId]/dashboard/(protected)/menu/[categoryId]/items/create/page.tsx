"use client";

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
import type { ItemJson } from "@/types/types";
import CreateItemForm from "@/components/ui/items/CreateItemForm";
import { ACCESS_LEVEL } from "@/types/types";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import PageHeading from "@/components/ui/PageHeader";
import type { Area, Point } from "react-easy-crop";

export default function CreateItemPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMessageImage, setErrorMessageImage] = useState<string | null>(
    null,
  );
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(1);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // For Cropping
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const router = useRouter();

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canCreateItem =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getLatestOrder() {
      setIsLoading(true);

      try {
        const response = await axios.get<{
          categories: {
            id: string;
            isSynced: boolean;
            syncGroupId: boolean | null;
            items: ItemJson[];
          }[];
        }>("/api/business/menu", {
          headers: {
            "x-business-id": businessId,
            "x-location-id": locationId,
          },
        });

        const category = response.data.categories.find(
          (category) => category.id === categoryId,
        );

        if (!category) {
          toast.error(
            "Creating an item with the selected category does not exist in our records",
          );
          return;
        }

        setHasSyncGroup(Boolean(category.syncGroupId));
        setIsSynced(category.isSynced);

        if (category.items.length === 0) {
          return;
        }

        const highestOrder = Math.max(
          ...category.items.map((item) => item.order),
        );

        setLatestOrder(highestOrder + 1);
      } catch (error) {
        console.error("Failed to get latest item order:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canCreateItem) {
      void getLatestOrder();
    }
  }, [businessId, locationId, categoryId, status, canCreateItem]);

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
    setImagePreview(null);

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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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
      price: typeof price === "string" && price !== "" ? Number(price) : null,
      isAvailable: isAvailable !== null,

      isSynced,
    };

    if (!requestBody.name) {
      setErrorMessage("An item name is required.");
      setIsCreating(false);
      return;
    }

    if (requestBody.price === null || Number.isNaN(requestBody.price)) {
      setErrorMessage("An item price is required.");
      setIsCreating(false);
      return;
    }

    try {
      const createItem = async (): Promise<ItemJson> => {
        // Create the item first.
        const itemResponse = await axios.post<ItemJson>(
          `/api/businesses/${businessId}/locations/${locationId}/categories/${categoryId}/items`,
          requestBody,
        );

        const item = itemResponse.data;

        // Item now exists.
        if (
          image instanceof File &&
          image.size > 0 &&
          selectedImage instanceof File &&
          selectedImage.size > 0
        ) {
          const imageFormData = new FormData();

          /*
           * image = cropped/display image
           * originalImage = uncropped source image
           */
          imageFormData.append("image", image);
          imageFormData.append("originalImage", selectedImage);
          imageFormData.append("isSynced", String(isSynced));

          try {
            await axios.post(
              `/api/businesses/${businessId}/locations/${locationId}/items/${item.id}/image`,
              imageFormData,
            );
          } catch (error) {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              console.error(
                "Item created, but image upload failed:",
                error.response?.data,
              );

              toast.error(
                error.response?.data?.error ??
                  "Item created, but image upload failed.",
              );
            } else {
              console.error("Item created, but image upload failed:", error);

              toast.error("Item created, but image upload failed.");
            }
          }
        }

        return item;
      };

      const itemToast = toast.promise<ItemJson>(createItem(), {
        loading: "Creating item...",
        success: "Item created.",
        error: (error) => {
          if (axios.isAxiosError<{ error?: string }>(error)) {
            return {
              message: "Failed to create item.",
              description:
                error.response?.data?.error ??
                `Status code: ${error.response?.status ?? "No response"}`,
            };
          }

          return {
            message: "Unexpected error.",
            description: "Something went wrong while creating the item.",
          };
        },
      });

      await itemToast.unwrap();

      form.reset();

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
      setImagePreview(null);
      setSelectedImage(null);
      setOriginalImageSrc(null);
      setCropImageSrc(null);
      setCroppedAreaPixels(null);

      setCanSubmit(false);
      setIsSynced(false);

      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`,
      );
    } catch (error) {
      console.error("Error in Create Item page:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the item.",
        );
      } else {
        setErrorMessage("Failed to create the item.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const price = formData.get("price");

    const hasName = typeof name === "string" && name.trim() !== "";
    const hasPrice = typeof price === "string" && price.trim() !== "";

    setCanSubmit(hasName && hasPrice);
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canCreateItem,
    pageTitle: "Menu",
    reason: "Your current access level does not allow item creation.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="create-item-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
        ariaLabel="Return to category"
        setIsLoading={setIsLoading}
        headingId="create-item-heading"
        heading="Create Item"
      />

      <div className="mt-[0.5rem]">
        {/* CREATE ITEM */}
        <CreateItemForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          isCreating={isCreating}
          errorMessage={errorMessage}
          errorMessageImage={errorMessageImage}
          canSubmit={canSubmit}
          latestOrder={latestOrder}
          hasSyncGroup={hasSyncGroup}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          imagePreview={imagePreview}
          cropImageSrc={cropImageSrc}
          crop={crop}
          zoom={zoom}
          croppedAreaPixels={croppedAreaPixels}
          handleImageChange={handleImageChange}
          setCrop={setCrop}
          setZoom={setZoom}
          handleCropComplete={handleCropComplete}
          handleUseCrop={handleUseCrop}
          handleEditCrop={handleEditCrop}
        />
      </div>
    </section>
  );
}
