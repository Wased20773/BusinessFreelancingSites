"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { ItemJson } from "@/types/types";
import axios from "axios";
import Image from "next/image";
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
import "../../../../page.css";

export default function EditItemPage() {
  const params = useParams<{
    categoryId: string;
    itemId: string;
  }>();

  const router = useRouter();

  const categoryId = params.categoryId;
  const itemId = params.itemId;

  const [itemData, setItemData] = useState<ItemJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState<boolean>(false);

  const [isCreatingOption, setIsCreatingOption] = useState<boolean>(false);

  const [processingOptionId, setProcessingOptionId] = useState<string | null>(
    null,
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function refreshItemData() {
    const refreshedItem = await axios
      .get<ItemJson>(`/api/business/menu/items/${itemId}`)
      .then((response) => response.data);

    setItemData(refreshedItem);
    setImagePreview(refreshedItem.imageKey ?? null);
  }

  useEffect(() => {
    async function getItemData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const itemToast = toast.promise<ItemJson>(
          axios
            .get<ItemJson>(`/api/business/menu/items/${itemId}`)
            .then((response) => response.data),
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
  }, [itemId]);

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

      price: typeof price === "string" && price !== "" ? Number(price) : null,

      isAvailable: isAvailable !== null,
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
      const updateItem = async (): Promise<ItemJson> => {
        const itemResponse = await axios.patch<ItemJson>(
          `/api/admin/items/${itemId}`,
          requestBody,
        );

        const updatedItem = itemResponse.data;

        /*
         * Images use their own route.
         */
        if (image instanceof File && image.size > 0) {
          const imageFormData = new FormData();

          imageFormData.append("image", image);

          setIsUpdatingImage(true);

          try {
            /*
             * Existing image -> replace it.
             */
            if (itemData?.imageKey) {
              await axios.patch(
                `/api/admin/items/${itemId}/image`,
                imageFormData,
              );
            } else {
              /*
               * No image -> create the first image.
               */
              await axios.post(
                `/api/admin/items/${itemId}/image`,
                imageFormData,
              );
            }
          } finally {
            setIsUpdatingImage(false);
          }
        }

        return updatedItem;
      };

      const updateToast = toast.promise<ItemJson>(updateItem(), {
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
        axios
          .delete(`/api/admin/items/${itemId}/image`)
          .then((response) => response.data),
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
        axios
          .delete(`/api/admin/items/${itemId}`)
          .then((response) => response.data),
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

      router.push(`/dashboard/categories/${categoryId}`);
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

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",

      price: typeof price === "string" && price !== "" ? Number(price) : null,
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
        axios.post(`/api/admin/items/${itemId}/options`, requestBody),
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

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",

      price: typeof price === "string" && price !== "" ? Number(price) : null,

      isAvailable: isAvailable !== null,
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
        axios.patch(
          `/api/admin/items/${itemId}/options/${optionId}`,
          requestBody,
        ),
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

  async function handleDeleteOption(optionId: string) {
    setProcessingOptionId(optionId);

    setErrorMessage(null);

    try {
      const optionToast = toast.promise(
        axios.delete(`/api/admin/items/${itemId}/options/${optionId}`),
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
    }
  }

  // ----------------------------
  // MOVE ITEM OPTION
  // ----------------------------

  async function handleMoveOption(optionId: string, direction: "up" | "down") {
    setProcessingOptionId(optionId);

    setErrorMessage(null);

    try {
      const optionToast = toast.promise(
        axios.patch(
          `/api/admin/items/${itemId}/options/${optionId}/move-${direction}`,
        ),
        {
          loading:
            direction === "up"
              ? "Moving option up..."
              : "Moving option down...",

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

      await optionToast.unwrap();

      await refreshItemData();
    } catch (error) {
      console.error("Error moving option:", error);

      setErrorMessage("Failed to move the option.");
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
          href={`/dashboard/categories/${categoryId}`}
          aria-label="Return to subcategory"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-item-heading">Edit Item</h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* ITEM FORM */}
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset disabled={isProcessing}>
            <legend>Item info</legend>

            <div>
              <label htmlFor="item-name">Name</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="item-name"
                name="name"
                type="text"
                defaultValue={itemData.name}
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
                step="10"
                defaultValue={itemData.calories ?? ""}
              />
            </div>

            <div>
              <label htmlFor="item-price">Price</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="item-price"
                name="price"
                type="number"
                min="0"
                step="0.10"
                defaultValue={itemData.price}
              />
            </div>
          </fieldset>

          <fieldset disabled={isProcessing}>
            <legend>Image</legend>

            {imagePreview && (
              <div className="mb-3">
                <Image
                  src={imagePreview}
                  alt={`${itemData.name} image preview`}
                  width={300}
                  height={300}
                  className="max-h-[300px] w-auto rounded-md object-contain"
                />
              </div>
            )}

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

        {/* ITEM OPTIONS */}
        <section
          className="dashboard-card mt-[1.5rem] p-4"
          aria-labelledby="item-options-heading"
        >
          <h2 id="item-options-heading">Item Options</h2>

          {/* CREATE OPTION */}
          <form
            className="mt-4 border-b border-gray-300 pb-5"
            onSubmit={handleCreateOption}
          >
            <fieldset
              className="grid gap-3 md:grid-cols-[1fr_150px_auto]"
              disabled={isCreatingOption}
            >
              <div>
                <label htmlFor="new-option-name">Name</label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                  id="new-option-name"
                  name="name"
                  type="text"
                  placeholder="Extra Cheese"
                />
              </div>

              <div>
                <label htmlFor="new-option-price">Price</label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                  id="new-option-price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.10"
                  placeholder="1.50"
                />
              </div>

              <button
                className="self-end bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-3 py-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                type="submit"
                disabled={isCreatingOption}
              >
                {isCreatingOption ? "Adding..." : "Add Option"}
              </button>
            </fieldset>
          </form>

          {/* EXISTING OPTIONS */}
          {options.length === 0 ? (
            <p className="pt-4">This item has no options</p>
          ) : (
            <div>
              {options.map((option, index) => {
                const isProcessingOption = processingOptionId === option.id;

                const isFirst = index === 0;

                const isLast = index === options.length - 1;

                return (
                  <form
                    key={option.id}
                    className="border-b border-gray-300 py-4 last:border-b-0"
                    onSubmit={(event) => handleUpdateOption(event, option.id)}
                  >
                    <fieldset
                      className="grid gap-3"
                      disabled={isProcessingOption}
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_150px_auto]">
                        <div>
                          <label htmlFor={`option-name-${option.id}`}>
                            Name
                          </label>

                          <input
                            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                            id={`option-name-${option.id}`}
                            name="name"
                            type="text"
                            defaultValue={option.name}
                          />
                        </div>

                        <div>
                          <label htmlFor={`option-price-${option.id}`}>
                            Price
                          </label>

                          <input
                            className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                            id={`option-price-${option.id}`}
                            name="price"
                            type="number"
                            min="0"
                            step="0.10"
                            defaultValue={option.price}
                          />
                        </div>

                        <label
                          className="flex items-end gap-2 pb-2 cursor-pointer"
                          htmlFor={`option-available-${option.id}`}
                        >
                          <input
                            id={`option-available-${option.id}`}
                            name="isAvailable"
                            type="checkbox"
                            defaultChecked={option.isAvailable}
                          />
                          Available?
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="border-[0.1rem] border-gray-500 rounded-md px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="button"
                          disabled={isProcessingOption || isFirst}
                          onClick={() => handleMoveOption(option.id, "up")}
                        >
                          Move Up
                        </button>

                        <button
                          className="border-[0.1rem] border-gray-500 rounded-md px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="button"
                          disabled={isProcessingOption || isLast}
                          onClick={() => handleMoveOption(option.id, "down")}
                        >
                          Move Down
                        </button>

                        <span>Order: {option.order}</span>

                        <button
                          className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="submit"
                          disabled={isProcessingOption}
                        >
                          {isProcessingOption ? "Saving..." : "Save"}
                        </button>

                        <button
                          className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="button"
                          disabled={isProcessingOption}
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </fieldset>
                  </form>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
