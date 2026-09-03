import ArrowIcon from "@/components/icons/arrow";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocationJson } from "@/types/types";
import axios from "axios";
import { Plus } from "lucide-react";
import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import CreateLocationModal from "../modal/CreateLocationModal";

type EnterDashboardDropdownProps = {
  businessId: string;
  locations: LocationJson[];
};

export default function EnterDashboardDropdown({
  businessId,
  locations,
}: EnterDashboardDropdownProps) {
  const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  async function handleCreateLocation(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const country = formData.get("country");

    if (typeof address !== "string" || !address.trim()) {
      setCreateErrorMessage("A location address is required.");
      return;
    }

    const requestBody = {
      address: address.trim(),
      city: typeof city === "string" ? city.trim() : "",
      state: typeof state === "string" ? state.trim() : "",
      zip: typeof zip === "string" ? zip.trim() : "",
      country: typeof country === "string" ? country.trim() : "",
    };

    setIsSubmitting(true);
    setCreateErrorMessage(null);

    try {
      const createLocationToast = toast.promise<LocationJson>(
        axios
          .post<{
            message: string;
            location: LocationJson;
          }>(`/api/businesses/${businessId}/locations`, requestBody)
          .then((response) => response.data.location),
        {
          loading: "Creating location...",
          success: (data) => ({
            message: "Location created",
            description: `${data.address} was created successfully.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create location.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the location.",
            };
          },
        },
      );

      await createLocationToast.unwrap();

      form.reset();

      setIsCreatingLocation(false);

      // Reload the user's businesses so the newly-created
      // business immediately appears in the list.
      window.location.reload();
    } catch (error) {
      console.error("Failed to create the location:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setCreateErrorMessage(
          error.response?.data?.error ?? "Failed to create the location.",
        );
      } else {
        setCreateErrorMessage("Failed to create the location.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"outline"} type="button" className="md:mx-3 md:my-2">
            Enter Dashboard <ArrowIcon size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuItem onClick={() => setIsCreatingLocation(true)}>
            <Plus />
            Create
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {locations.map((location) => (
              <DropdownMenuItem key={location.id} asChild>
                <Link
                  href={`/businesses/${businessId}/locations/${location.id}/dashboard`}
                >
                  {location.address}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {isCreatingLocation && (
        <CreateLocationModal
          isSubmitting={isSubmitting}
          setIsCreatingLocation={setIsCreatingLocation}
          handleCreateLocation={handleCreateLocation}
          createErrorMessage={createErrorMessage}
        />
      )}
    </>
  );
}
