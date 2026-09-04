import {
  BadgeCheckIcon,
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { DashboardNavAccount } from "@/types/types";
import PlaceHolderAccountWhite from "@/components/icons/placeholder-account-white.svg";
import { signOut } from "next-auth/react";

type AccountDropdownProps = {
  currentAccount: DashboardNavAccount;
  theme: "dark" | "light";
  layout?: "default" | "compact-mobile";
};

export default function AccountDropdown({
  currentAccount,
  theme,
  layout = "default",
}: AccountDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={[
            "min-w-0 flex items-center gap-2 px-0",
            layout === "compact-mobile"
              ? "w-full justify-center min-[400px]:justify-start"
              : "w-full justify-start",
            "text-gray-200",
            "hover:bg-transparent",
            "hover:text-white",
            "data-[state=open]:bg-transparent",
            "data-[state=open]:text-white",
          ].join(" ")}
        >
          <Image
            className="shrink-0 border-[2px] border-gray-100 rounded-full overflow-hidden"
            src={currentAccount.image || PlaceHolderAccountWhite}
            alt="Account profile"
            width={40}
            height={40}
            loading="eager"
          />
          <span
            className={[
              "min-w-0 flex-1 truncate text-left",
              layout === "compact-mobile"
                ? "hidden min-[400px]:block"
                : "block",
              theme === "dark" ? "text-gray-300" : "text-black",
            ].join(" ")}
          >
            {currentAccount.name}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>

          <DropdownMenuItem>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOutIcon />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
