"use client";

import Image from "next/image";
import Link from "next/link";
import "./SideBar.css";
import Logo from "../../../../public/logo.svg";
import { usePathname } from "next/navigation";
import { dashboardLinks } from "@/data/dashboardLinks";
import PlaceHolderAccountBlack from "@/components/icons/placeholder-account-black.svg";
import SettingsIconBlack from "@/components/icons/settings-black.svg";
import { DashboardNavProps } from "@/types/types";

export default function SideBar({
  currentBusiness,
  currentAccount,
}: DashboardNavProps) {
  const pathname = usePathname();

  const settingsSelected = pathname === "/dashboard/settings";

  return (
    <aside className="hidden h-screen w-[250px] grid-rows-[auto_minmax(0,1fr)_auto] md:grid bg-gray-50 border-r border-gray-300">
      {/* Client Logo + Name */}
      <div className="border-b border-gray-300 p-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1">
        <Image
          src={Logo}
          alt="Client logo"
          width={50}
          height={50}
          loading="eager"
        />
        <span className="min-w-0 text-gray-900 font-semibold px-2 truncate">
          {currentBusiness.name}
        </span>
      </div>

      {/* Navigation Links */}
      <nav
        className="border-b border-gray-300 p-2 overflow-y-scroll min-h-0"
        aria-label="Dashboard Navigation"
      >
        <ul className="flex flex-col gap-1">
          {dashboardLinks.map((link) => {
            const isSelected =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isSelected ? "page" : undefined}
                  className={["sidebar-nav-links", isSelected && "selected"]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account */}
      <div className="flex flex-col p-2 gap-1">
        <Link
          className={["sidebar-nav-links", settingsSelected && "selected"]
            .filter(Boolean)
            .join(" ")}
          href={"/dashboard/settings"}
        >
          <Image
            src={SettingsIconBlack}
            alt="Settings icon"
            width={35}
            height={35}
            loading="eager"
          />
          <span>Settings</span>
        </Link>
        <div className="min-w-0 grid grid-cols-[auto_minmax(0,1fr)] items-center px-3 py-1">
          <Image
            className="border-[2px] border-gray-900 rounded-[50%] overflow-hidden"
            src={PlaceHolderAccountBlack}
            alt="Account profile"
            height={35}
            width={35}
            loading="eager"
          />
          <div className="min-w-0 flex flex-col px-2">
            <span className="text-gray-900 truncate">
              {currentAccount.name}
            </span>
            <span className="text-gray-500 truncate">
              {currentAccount.accessLevel}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
