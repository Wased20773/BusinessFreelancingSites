"use client";

import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import LoadingBar from "@/components/ui/LoadingBar";
import type { DashboardNavAccount, DashboardNavBusiness } from "@/types/types";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

type SettingsLayoutClientProps = {
  children: ReactNode;
  currentBusiness: DashboardNavBusiness;
  currentAccount: DashboardNavAccount;
  businessId?: string;
  navLinks: {
    name: string;
    href: string;
  }[];
};

export default function SettingsLayoutClient({
  children,
  currentBusiness,
  currentAccount,
  businessId,
  navLinks,
}: SettingsLayoutClientProps) {
  const pathname = usePathname();

  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const isNavigating =
    navigationTarget !== null && pathname !== navigationTarget;

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
      <SideBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        variant="settings"
        navLinks={navLinks}
        businessId={businessId}
        onNavigate={(href) => setNavigationTarget(href)}
      />

      <MobileNavBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        variant="settings"
        navLinks={navLinks}
        businessId={businessId}
        onNavigate={(href) => setNavigationTarget(href)}
      />

      <main className="min-h-0 overflow-y-scroll">
        {isNavigating ? <LoadingBar /> : children}
      </main>
    </div>
  );
}
