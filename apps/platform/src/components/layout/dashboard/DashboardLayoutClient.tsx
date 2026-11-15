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

  // The layout is exactly the visible screen height (dvh). 100vh is taller
  // than the screen on phones while the address bar shows, which let the whole
  // page scroll one extra step and take the header with it. vh is the fallback.
  return (
    <div className="h-screen supports-[height:100dvh]:h-dvh grid grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-1">
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

      {/* The content column may shrink below its content (minmax(0, 1fr) and
          min-w-0), so wide content like a table scrolls inside its own box
          instead of stretching the whole page sideways on phones.
          relative: absolutely positioned elements in a page (like sr-only
          labels) are placed inside main, so they scroll with it instead of
          making the whole document taller and scrolling the header away. */}
      <main className="relative min-h-0 min-w-0 overflow-y-auto">
        {isNavigating ? <LoadingBar /> : children}
      </main>
    </div>
  );
}
