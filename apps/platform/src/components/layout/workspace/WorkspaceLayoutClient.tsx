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

type WorkspaceLayoutClientProps = {
  children: ReactNode;
  businessId: string;
  currentAccount: DashboardNavAccount;
};

export default function WorkspaceLayoutClient({
  children,
  businessId,
  currentAccount,
}: WorkspaceLayoutClientProps) {
  const [businesses, setBusinesses] = useState<BusinessOwnerShip[]>([]);
  const [locations, setLocations] = useState<LocationJson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const selectedBusiness = businesses.find(
    (businessUser) => businessUser.business?.id === businessId,
  );

  if (isLoading) {
    return null;
  }

  if (!selectedBusiness) {
    return <div>something wrong happened</div>;
  }

  const currentBusiness = {
    name: selectedBusiness.business.name,
  };

  const navLinks = workspaceLinks(businessId);

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-[auto_1fr]">
      <div className="relative z-20 md:static md:z-auto md:col-start-1 md:row-start-1 md:row-span-2">
        <SideBar
          variant="workspace"
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          navLinks={navLinks}
          businesses={businesses}
        />

        <MobileNavBar
          variant="workspace"
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          navLinks={navLinks}
          businesses={businesses}
          businessId={selectedBusiness.business.id}
          locations={locations}
        />
      </div>

      <div className="hidden md:block border-b border-gray-300">
        {/* Location / Enter Dashboard control */}
        <EnterDashboardDropdown businessId={businessId} locations={locations} />
      </div>

      <main className="min-h-0 overflow-y-scroll p-5">{children}</main>
    </div>
  );
}
