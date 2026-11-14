"use client";

import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import EnterDashboardDropdown from "@/components/ui/dropdown/EnterDashboardDropdown";
import { workspaceLinks } from "@/data/workspaceLinks";
import { getBusinesses } from "@/lib/api/business";
import { getLocations } from "@/lib/api/locations";
import type {
  BusinessOwnerShip,
  DashboardNavAccount,
  LocationJson,
} from "@/types/types";
import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingBar from "@/components/ui/LoadingBar";
import WorkspaceTour from "@/components/ui/tours/WorkspaceTour";
import PayerLeftBanner from "@/components/ui/billing/PayerLeftBanner";
import type { PayerLeftNotice } from "@/lib/billing/payerLeftNotice";

type WorkspaceLayoutClientProps = {
  children: ReactNode;
  businessId: string;
  currentAccount: DashboardNavAccount;
  payerLeftNotice: PayerLeftNotice | null; // only ever set for owners
};

const CURRENT_WORKSPACE_TOUR_VERSION = 1;

export default function WorkspaceLayoutClient({
  children,
  businessId,
  currentAccount,
  payerLeftNotice,
}: WorkspaceLayoutClientProps) {
  const [businesses, setBusinesses] = useState<BusinessOwnerShip[]>([]);
  const [locations, setLocations] = useState<LocationJson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [navigationFrom, setNavigationFrom] = useState<string | null>(null);

  const pathname = usePathname();

  /*
   * Once the path changes, the navigation finished, so forget where it came
   * from. Otherwise coming back to that page through any other link (not the
   * sidebar) would match the stale value and show the loading bar forever.
   */
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setNavigationFrom(null);
  }

  const isNavigating = navigationFrom !== null && pathname === navigationFrom;

  const { data: session, update } = useSession();

  useEffect(() => {
    async function loadWorkspace() {
      try {
        setIsLoading(true);

        const businessData = await getBusinesses();
        const locationData = await getLocations(businessId);

        setBusinesses(businessData);
        setLocations(locationData);
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [businessId]);

  /*
   * Refresh the selected business context whenever
   * the user navigates within the workspace.
   *
   * auth.ts will retrieve the latest BusinessUser role
   * and update session.user.accessLevel.
   */
  useEffect(() => {
    void update({
      businessId,
    });
  }, [businessId]);

  const selectedBusiness = businesses.find(
    (businessUser) => businessUser.business?.id === businessId,
  );

  if (isLoading) {
    return null;
  }

  if (!selectedBusiness) {
    return <p>something wrong happened</p>;
  }

  const currentBusiness = {
    name: selectedBusiness.business.name,
    imageKey: selectedBusiness.business.imageKey,
  };

  const activeAccount: DashboardNavAccount = {
    name: session?.user?.name ?? currentAccount.name,
    image: session?.user?.image ?? currentAccount.image,
    accessLevel: session?.user?.accessLevel ?? currentAccount.accessLevel,
    workspaceTourVersion:
      session?.user?.workspaceTourVersion ??
      currentAccount.workspaceTourVersion,
  };

  const navLinks = workspaceLinks(businessId);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-[auto_1fr]">
      <div className="relative z-20 md:static md:z-auto md:col-start-1 md:row-start-1 md:row-span-2">
        <SideBar
          variant="workspace"
          currentBusiness={currentBusiness}
          currentAccount={activeAccount}
          navLinks={navLinks}
          businesses={businesses}
          onNavigate={() => setNavigationFrom(pathname)}
        />

        <MobileNavBar
          variant="workspace"
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          currentBusiness={currentBusiness}
          currentAccount={activeAccount}
          navLinks={navLinks}
          businesses={businesses}
          businessId={selectedBusiness.business.id}
          locations={locations}
          onNavigate={() => setNavigationFrom(pathname)}
        />
      </div>

      <div className="hidden md:block border-b-[0.1rem] border-gray-300">
        {/* Location / Enter Dashboard control */}
        <WorkspaceTour
          shouldStartTour={
            (currentAccount.workspaceTourVersion ?? 0) <
            CURRENT_WORKSPACE_TOUR_VERSION
          }
          openMobileNav={setIsOpen}
        />
        <EnterDashboardDropdown businessId={businessId} locations={locations} />
      </div>

      <main className="min-h-0 overflow-y-auto">
        {/* The Billing page already explains it in the Current Plan card. */}
        {payerLeftNotice && !pathname.endsWith("/billing") && (
          <PayerLeftBanner notice={payerLeftNotice} businessId={businessId} />
        )}

        {isNavigating ? <LoadingBar /> : children}
      </main>
    </div>
  );
}
