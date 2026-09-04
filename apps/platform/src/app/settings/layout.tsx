import { auth } from "@/auth";
import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
import { settingsLinks } from "@/data/settingsLinks";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type SettingsLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/dashboard/login");
  }

  if (!session.user.accessLevel) {
    redirect("/businesses");
  }

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
  };
  /*
   * We can still keep the last selected business
   * available so "Go Back" returns to the workspace
   * of the selected business.
   */
  const currentBusiness = {
    id: session.user.businessId ?? "",
    slug: session.user.businessSlug ?? "",
    name: session.user.businessName ?? "",
  };

  const navLinks = settingsLinks();

  return (
    <AuthSessionProvider>
      <ResponsiveToaster />

      <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
        <SideBar
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          variant="settings"
          navLinks={navLinks}
          businessId={session.user.businessId}
        />

        <MobileNavBar
          currentBusiness={currentBusiness}
          currentAccount={currentAccount}
          variant="settings"
          navLinks={navLinks}
          businessId={session.user.businessId}
        />

        <main className="min-h-0 overflow-y-scroll p-5">{children}</main>
      </div>
    </AuthSessionProvider>
  );
}
