"use client";

import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import LoadingBar from "@/components/ui/LoadingBar";
import DashboardTour from "@/components/ui/tours/DashboardTour";
import { dashboardLinks } from "@/data/dashboardLinks";
import type { DashboardNavAccount, DashboardNavBusiness } from "@/types/types";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type DashboardLayoutClientProps = {
  children: ReactNode;
  currentBusiness: DashboardNavBusiness;
  currentAccount: DashboardNavAccount;
  businessId: string;
  locationId: string;
};

const CURRENT_DASHBOARD_TOUR_VERSION = 1;

export default function DashboardLayoutClient({
  children,
  currentBusiness,
  currentAccount,
  businessId,
  locationId,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();

  const [navigationFrom, setNavigationFrom] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isNavigating = navigationFrom !== null && pathname === navigationFrom;

  useEffect(() => {
    if (navigationFrom !== null && pathname !== navigationFrom) {
      const timeout = setTimeout(() => {
        setNavigationFrom(null);
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [pathname, navigationFrom]);

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
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        variant="dashboard"
        navLinks={navLinks}
        businessId={businessId}
        onNavigate={() => setNavigationFrom(pathname)}
      />

      <DashboardTour
        shouldStartTour={
          (currentAccount.dashboardTourVersion ?? 0) <
          CURRENT_DASHBOARD_TOUR_VERSION
        }
        openMobileNav={setIsOpen}
      />

      <main className="min-h-0 overflow-y-scroll">
        {isNavigating ? <LoadingBar /> : children}
      </main>
    </div>
  );
}
