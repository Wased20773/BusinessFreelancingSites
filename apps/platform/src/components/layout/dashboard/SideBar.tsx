"use client";

import Image from "next/image";
import Link from "next/link";
import "./SideBar.css";
import Logo from "../../../../public/logo.svg";
import { usePathname } from "next/navigation";
import { DashboardNavProps } from "@/types/types";
import BusinessesDropdown from "@/components/ui/dropdown/BusinessesDropdown";
import AccountDropdown from "@/components/ui/dropdown/AccountDropdown";
import ArrowIcon from "@/components/icons/arrow";

export default function SideBar({
  currentBusiness,
  currentAccount,
  variant,
  navLinks,
  businesses,
  businessId,
  onNavigate,
}: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[250px] grid-rows-[auto_minmax(0,1fr)_auto] md:grid bg-gray-50 border-r-[0.1rem] border-gray-300">
      {variant === "workspace" && businesses && (
        <>
          {/* Business Select */}
          <BusinessesDropdown businesses={businesses} onNavigate={onNavigate} />
        </>
      )}
      {variant === "dashboard" && (
        <>
          {/* Client Logo + Name */}
          <div className=" border-gray-300 p-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1">
            <Image
              src={Logo}
              alt="Client logo"
              width={35}
              height={35}
              loading="eager"
            />
            <span className="min-w-0 text-gray-900 font-semibold px-2 truncate">
              {currentBusiness.name}
            </span>
          </div>
        </>
      )}
      {variant === "settings" && (
        <>
          {/* Client Logo + Name */}
          <div className=" border-gray-300 p-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1">
            <Image
              src={Logo}
              alt="Client logo"
              width={35}
              height={35}
              loading="eager"
            />
            <span className="min-w-0 text-gray-900 font-semibold px-2 truncate">
              Business Platform
            </span>
          </div>
        </>
      )}

      {/* Navigation Links */}
      <nav
        className="border-t-[0.1rem] border-b-[0.1rem] border-gray-300 overflow-y-auto min-h-0 p-2"
        aria-label="Dashboard Navigation"
      >
        <ul className="flex flex-col gap-1">
          {navLinks.map((link) => {
            const isSelected = pathname === link.href;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isSelected ? "page" : undefined}
                  onClick={() => {
                    if (!isSelected) {
                      onNavigate?.(link.href);
                    }
                  }}
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

      {/* Extras */}
      <div className="min-w-0 flex flex-col gap-3 p-2">
        {/* <Link
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
            src={currentAccount.image || PlaceHolderAccountBlack}
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
            </div> */}
        {variant === "workspace" && (
          <AccountDropdown
            theme={"light"}
            currentAccount={currentAccount}
            onNavigate={onNavigate}
          />
        )}
        {variant === "dashboard" && (
          <Link
            href={`/businesses/${businessId}`}
            className="flex items-center gap-2 px-2"
            onClick={() => onNavigate?.(`/businesses/${businessId}`)}
          >
            <ArrowIcon direction="left" size={20} />
            <span>Go Back to Workspace</span>
          </Link>
        )}
        {variant === "settings" && (
          <Link
            href={`/businesses/${businessId}`}
            className="flex items-center gap-2 px-2"
            onClick={() => onNavigate?.(`/businesses/${businessId}`)}
          >
            <ArrowIcon direction="left" size={20} />
            <span>Go Back to Workspace</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
