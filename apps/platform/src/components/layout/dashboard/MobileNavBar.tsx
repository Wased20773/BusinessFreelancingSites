"use client";

import Image from "next/image";
import BurgerButton from "@/components/icons/burger-button.svg";
import ExitButtonWhite from "@/components/icons/exit-white.svg";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "@/components/layout/dashboard/MobileNavBar.css";
import Logo from "../../../../public/logo.svg";
import { DashboardNavProps } from "@/types/types";
import EnterDashboardDropdown from "@/components/ui/dropdown/EnterDashboardDropdown";
import BusinessesDropdown from "@/components/ui/dropdown/BusinessesDropdown";
import AccountDropdown from "@/components/ui/dropdown/AccountDropdown";

export default function MobileNavBar({
  currentBusiness,
  currentAccount,
  variant,
  navLinks,
  businesses,
  businessId,
  locations,
}: DashboardNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();

  return (
    <header className="md:hidden flex justify-between items-center gap-1 border-b border-gray-300 bg-gray-50 p-2 z-20">
      {/* Burger Button */}
      <button
        className="cursor-pointer w-[50px] h-[50px] flex justify-center items-center"
        type="button"
        aria-label="Open dashboard navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={BurgerButton}
          alt="Open menu button"
          width={50}
          height={50}
          loading="eager"
        />
      </button>

      {variant === "workspace" && businesses && businessId && locations && (
        <>
          {/* Location Select */}
          <EnterDashboardDropdown
            businessId={businessId}
            locations={locations}
          />
        </>
      )}
      {variant === "dashboard" && (
        <>
          {/* Client Logo + Name */}
          <div className="flex flex-row items-center gap-3">
            <span className="text-gray-900 font-semibold">
              {currentBusiness.name}
            </span>
            <Image
              src={Logo}
              alt="Client Logo"
              width={50}
              height={50}
              loading="eager"
            />
          </div>
        </>
      )}

      {/* Slide Into View After Clicking Burger Button */}
      <div
        className={["mobile-nav-group", isOpen && "open-nav"]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 gap-3">
          {variant === "workspace" && businesses && (
            <div className="flex-1">
              {/* Business Select */}
              <BusinessesDropdown businesses={businesses} />
            </div>
          )}
          {variant === "dashboard" && (
            <div className="flex flex-row items-center gap-3">
              <Image
                src={Logo}
                alt="Client logo"
                width={50}
                height={50}
                loading="eager"
              />
              <span className="font-semibold text-gray-100">
                {currentBusiness.name}
              </span>
            </div>
          )}

          <button
            className="cursor-pointer"
            type="button"
            aria-label="Close dashboard navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(false)}
          >
            <Image
              src={ExitButtonWhite}
              alt="Exit menu button"
              width={50}
              height={50}
              loading="eager"
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 overflow-y-auto border-b border-gray-500">
          <ul>
            {navLinks.map((link) => {
              const isSelected = pathname === link.href;

              return (
                <li key={link.href} className="border-t border-gray-300">
                  <Link
                    href={link.href}
                    aria-current={isSelected ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={["mobile-nav-link", isSelected && "selected"]
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
        <div className="p-3">
          {/* <div className="grid grid-cols-[1fr_auto_auto]"> */}
          {/* <div className="flex flex-row items-center justify-evenly">
            <Link
              href="/dashboard/settings"
              className={[
                "group mobile-bottom-nav-link",
                settingsSelected && "selected",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setIsOpen(false)}
            >
              <div className="relative h-[40px] w-[40px]">
                <Image
                  src={SettingsIconWhite}
                  alt="Settings icon"
                  fill
                  className={[
                    "object-contain transition-opacity duration-200",
                    settingsSelected
                      ? "opacity-0"
                      : "opacity-100 group-hover:opacity-0",
                  ].join(" ")}
                  loading="eager"
                />
                <Image
                  src={SettingsIconBlack}
                  alt=""
                  aria-hidden="true"
                  fill
                  className={[
                    "object-contain opacity-0 transition-opacity duration-200",
                    settingsSelected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  ].join(" ")}
                  loading="eager"
                />
              </div>

              <span>Settings</span>
            </Link>
          </div>

          <div className="border-l border-gray-500 w-0 ml-3 mr-3"></div> */}

          <div className="flex items-center py-2">
            <AccountDropdown theme={"dark"} currentAccount={currentAccount} />
          </div>
        </div>
      </div>
    </header>
  );
}
