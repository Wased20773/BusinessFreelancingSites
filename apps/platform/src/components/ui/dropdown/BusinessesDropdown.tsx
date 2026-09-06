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
import { BusinessOwnerShip } from "@/types/types";
import { Plus } from "lucide-react";
import { SubmitEvent, useState } from "react";
import CreateBusinessModal from "../modal/CreateBusinessModal";
import axios from "axios";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type CreateBusinessResponse = {
  message: string;

  business: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
  };

  location: {
    id: string;
    address: string;
  };
};

type BusinessesDropdownProps = {
  businesses: BusinessOwnerShip[];
  variant?:
    | "outline"
    | "link"
    | "default"
    | "secondary"
    | "ghost"
    | "destructive"
    | null
    | undefined;
  onNavigate?: (href: string) => void;
};

export default function BusinessesDropdown({
  businesses,
  variant = "outline",
  onNavigate,
}: BusinessesDropdownProps) {
  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();

  async function handleBusinessSelect(businessId: string) {
    const href = `/businesses/${businessId}`;

    if (
      pathname === `/businesses/${businessId}` ||
      pathname.startsWith(`/businesses/${businessId}/`)
    ) {
      return;
    }

    onNavigate?.(href);

    await update({
      businessId,
    });

    router.push(href);
  }

  async function handleCreateBusiness(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const address = formData.get("address");

    if (typeof name !== "string" || !name.trim()) {
      setCreateErrorMessage("A business name is required.");
      return;
    }

    if (typeof address !== "string" || !address.trim()) {
      setCreateErrorMessage("A location address is required.");
      return;
    }

    setIsSubmitting(true);
    setCreateErrorMessage(null);

    try {
      const createBusinessToast = toast.promise<CreateBusinessResponse>(
        axios
          .post<CreateBusinessResponse>("/api/onboarding/business", {
            name: name.trim(),
            address: address.trim(),
          })
          .then((response) => response.data),
        {
          loading: "Creating business...",
          success: (data) => ({
            message: "Business created",
            description: `${data.business.name} was created successfully.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create business.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the business.",
            };
          },
        },
      );

      await createBusinessToast.unwrap();

      form.reset();

      setIsCreatingBusiness(false);

      // Reload the user's businesses so the newly-created
      // business immediately appears in the list.
      window.location.reload();
    } catch (error) {
      console.error("Failed to create the business:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setCreateErrorMessage(
          error.response?.data?.error ?? "Failed to create the business.",
        );
      } else {
        setCreateErrorMessage("Failed to create the business.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            type="button"
            className="flex w-[calc(100%-1.5rem)] justify-center items-center gap-2 mx-3 my-2 md:w-auto"
          >
            Select Business
            <ArrowIcon direction="down" size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuItem onClick={() => setIsCreatingBusiness(true)}>
            <Plus />
            Create
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {businesses.map((businessUser) => {
              const href = `/businesses/${businessUser.business.id}`;
              const isSelected =
                pathname === href || pathname.startsWith(`${href}/`);

              return (
                <DropdownMenuItem
                  key={businessUser.business.id}
                  className={
                    isSelected ? "bg-accent text-accent-foreground" : undefined
                  }
                  onSelect={() =>
                    void handleBusinessSelect(businessUser.business.id)
                  }
                >
                  {businessUser.business.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {isCreatingBusiness && (
        <CreateBusinessModal
          isSubmitting={isSubmitting}
          setIsCreatingBusiness={setIsCreatingBusiness}
          handleCreateBusiness={handleCreateBusiness}
          createErrorMessage={createErrorMessage}
        />
      )}
    </>
  );
}
