"use client";

import ArrowIcon from "@/components/icons/arrow";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import type { ItemJson } from "@/types/types";

export default function CreateItemPage() {
  const params = useParams<{ categoryId: string }>();

  const categoryId = params.categoryId;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

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
      setIsLoading(false);
      return;
    }

    if (requestBody.price === null || Number.isNaN(requestBody.price)) {
      setErrorMessage("An item price is required.");
      setIsLoading(false);
      return;
    }

    try {
      const createItem = async (): Promise<ItemJson> => {
        // Create the item first.
        const itemResponse = await axios.post<ItemJson>(
          `/api/admin/categories/${categoryId}/items`,
          requestBody,
        );

        const item = itemResponse.data;

        // Item now exists.
        if (image instanceof File && image.size > 0) {
          const imageFormData = new FormData();

          imageFormData.append("image", image);

          try {
            await axios.post(
              `/api/admin/items/${item.id}/image`,
              imageFormData,
            );
          } catch (error) {
            console.error("Item created, but image upload failed:", error);

            toast.error("Item created, but image upload failed.");
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
      setCanSubmit(false);
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
      setIsLoading(false);
    }
  }

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const price = formData.get("price");

    const hasName = typeof name === "string" && name.trim() !== "";

    const hasPrice = typeof price === "string" && price.trim() !== "";

    setCanSubmit(hasName && hasPrice);
  }

  return (
    <section aria-labelledby="create-item-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/categories/${categoryId}`}
          aria-label="Return to category"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-item-heading">Create Item</h1>
      </header>

      <div className="mt-[1.5rem]">
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset disabled={isLoading}>
            <legend>Item info</legend>

            <div>
              <label htmlFor="item-name">Name</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="item-name"
                name="name"
                type="text"
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
                step="10"
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
              />
            </div>
          </fieldset>

          <fieldset disabled={isLoading}>
            <legend>Availability</legend>

            <label htmlFor="item-available" className="cursor-pointer">
              <input
                className="mr-2"
                id="item-available"
                name="isAvailable"
                type="checkbox"
                defaultChecked
              />
              Available?
            </label>
          </fieldset>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          <button
            className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </section>
  );
}
