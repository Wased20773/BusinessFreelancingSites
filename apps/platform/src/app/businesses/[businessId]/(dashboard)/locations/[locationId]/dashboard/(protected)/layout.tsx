import { auth } from "@/auth";
import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
import { dashboardLinks } from "@/data/dashboardLinks";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{
    businessId: string;
    locationId: string;
  }>;
}>;

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) redirect("/dashboard/login");

  if (
    !session.user.businessId ||
    !session.user.businessSlug ||
    !session.user.businessName ||
    !session.user.accessLevel
  ) {
    redirect("/onboarding");
  }

  // ##############################################
  // ##### Load persistent data for all pages #####
  // ##############################################

  const currentBusiness = {
    id: session.user.businessId,
    slug: session.user.businessSlug,
    name: session.user.businessName,
  };

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
  };

  const { businessId, locationId } = await params;

  const navLinks = dashboardLinks(businessId, locationId);

  return (
    <>
      <ResponsiveToaster />
      <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
        <SideBar
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          variant="dashboard"
          navLinks={navLinks}
          businessId={businessId}
        />
        <MobileNavBar
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          variant="dashboard"
          navLinks={navLinks}
          businessId={businessId}
        />

        <main className="min-h-0 overflow-y-scroll p-5">{children}</main>
      </div>
    </>
  );
}
