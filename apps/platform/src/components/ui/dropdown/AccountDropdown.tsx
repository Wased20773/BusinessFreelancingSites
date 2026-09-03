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

type AccountDropdownProps = {
  currentAccount: DashboardNavAccount;
  theme: "dark" | "light";
};

export default function AccountDropdown({
  currentAccount,
  theme,
}: AccountDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="
                    flex items-center gap-2 px-2
                    text-gray-200
                    hover:bg-transparent
                    hover:text-white
                    data-[state=open]:bg-transparent
                    data-[state=open]:text-white
                  "
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
            className={
              theme === "dark"
                ? "text-gray-300"
                : theme === "light"
                  ? "text-gray-800"
                  : undefined
            }
          >
            Account
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

          <DropdownMenuItem>
            <BellIcon />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <LogOutIcon />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
