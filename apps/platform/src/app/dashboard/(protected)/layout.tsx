import { auth } from "@/auth";
import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/dashboard/login");
  }

  /*
   * Later, this can redirect authenticated users who have not
   * created or joined a business to the onboarding page.
   */
  if (
    !session.user.businessId ||
    !session.user.businessSlug ||
    !session.user.businessName ||
    !session.user.accessLevel
  ) {
    throw new Error("No business is associated with this account.");
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

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
      <SideBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
      />
      <MobileNavBar
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
      />

      <main className="min-h-0 overflow-y-scroll p-5">{children}</main>
    </div>
  );
}
