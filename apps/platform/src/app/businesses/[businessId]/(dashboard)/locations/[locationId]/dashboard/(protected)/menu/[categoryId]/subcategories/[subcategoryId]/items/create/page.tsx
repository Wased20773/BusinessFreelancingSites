"use client";

import ArrowIcon from "@/components/icons/arrow";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../../../page.css";
import { ACCESS_LEVEL, type CategoryJson, type ItemJson } from "@/types/types";
import CreateItemForm from "@/components/ui/items/CreateItemForm";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

export default function CreateItemPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    subcategoryId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;
  const subcategoryId = params.subcategoryId;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(1);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

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
            subcategories: {
              id: string;
              isSynced: boolean;
              syncGroupId: string;
              items: ItemJson[];
            }[];
          }[];
        }>("/api/business/menu", {
          headers: {
            "x-business-id": businessId,
            "x-location-id": locationId,
          },
        });

        const selectedCategory = response.data.categories.find(
          (category) => category.id === categoryId,
        );

        const selectedSubcategory = selectedCategory?.subcategories?.find(
          (subcategory) => subcategory.id === subcategoryId,
        );

        if (!selectedSubcategory) {
          toast.error(
            "Creating an item with the selected subcategory does not exist in our records",
          );
          return;
        }

        setHasSyncGroup(Boolean(selectedSubcategory.syncGroupId));
        setIsSynced(selectedSubcategory.isSynced);

        if (selectedSubcategory.items.length === 0) {
          return;
        }

        const highestOrder = Math.max(
          ...selectedSubcategory.items.map((item) => item.order),
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
  }, [
    businessId,
    locationId,
    categoryId,
    subcategoryId,
    status,
    canCreateItem,
  ]);

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
      isAvailable: true,
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
          `/api/businesses/${businessId}/locations/${locationId}/categories/${subcategoryId}/items`,
          requestBody,
        );

        const item = itemResponse.data;

        // Item now exists.
        if (image instanceof File && image.size > 0) {
          const imageFormData = new FormData();

          imageFormData.append("image", image);
          imageFormData.append("isSynced", String(isSynced));

          try {
            await axios.post(
              `/api/businesses/${businessId}/locations/${locationId}/items/${item.id}/image`,
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
      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`,
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

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
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
      className="max-w-[1000px] mx-auto p-5"
    >
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`}
          aria-label="Return to subcategory"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-item-heading">Create Item</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateItemForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          isCreating={isCreating}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          latestOrder={latestOrder}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          hasSyncGroup={hasSyncGroup}
        />
      </div>
    </section>
  );
}
