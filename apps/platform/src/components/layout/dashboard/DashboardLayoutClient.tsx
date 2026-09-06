"use client";

import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import LoadingBar from "@/components/ui/LoadingBar";
import { dashboardLinks } from "@/data/dashboardLinks";
import type { DashboardNavAccount, DashboardNavBusiness } from "@/types/types";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

type DashboardLayoutClientProps = {
  children: ReactNode;
  currentBusiness: DashboardNavBusiness;
  currentAccount: DashboardNavAccount;
  businessId: string;
  locationId: string;
};

export default function DashboardLayoutClient({
  children,
  currentBusiness,
  currentAccount,
  businessId,
  locationId,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();

  const [navigationFrom, setNavigationFrom] = useState<string | null>(null);

  const isNavigating = navigationFrom !== null && pathname === navigationFrom;

  const navLinks = dashboardLinks(businessId, locationId);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
      <SideBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        variant="dashboard"
        navLinks={navLinks}
        businessId={businessId}
        onNavigate={() => setNavigationFrom(pathname)}
      />

      <MobileNavBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        variant="dashboard"
        navLinks={navLinks}
        businessId={businessId}
        onNavigate={() => setNavigationFrom(pathname)}
      />

      <main className="min-h-0 overflow-y-scroll">
        {isNavigating ? <LoadingBar /> : children}
      </main>
    </div>
  );
}
