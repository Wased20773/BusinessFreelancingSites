import { auth } from "@/auth";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import SettingsLayoutClient from "@/components/layout/settings/SettingsLayoutClient";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
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
   * Keep the last selected business available
   * so "Go Back" returns to the workspace
   * of the selected business.
   */
  const currentBusiness = {
    name: session.user.businessName ?? "",
  };

  return (
    <AuthSessionProvider>
      <ResponsiveToaster />

      <SettingsLayoutClient
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        businessId={session.user.businessId}
      >
        {children}
      </SettingsLayoutClient>
    </AuthSessionProvider>
  );
}
