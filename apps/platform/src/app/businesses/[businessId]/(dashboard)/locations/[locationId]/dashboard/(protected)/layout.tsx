import { auth } from "@/auth";
import DashboardLayoutClient from "@/components/layout/dashboard/DashboardLayoutClient";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
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

  if (!session?.user) {
    redirect("/dashboard/login");
  }

  if (
    !session.user.businessId ||
    !session.user.businessSlug ||
    !session.user.businessName ||
    !session.user.accessLevel
  ) {
    redirect("/onboarding");
  }

  const currentBusiness = {
    name: session.user.businessName,
  };

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
  };

  const { businessId, locationId } = await params;

  return (
    <>
      <ResponsiveToaster />

      <DashboardLayoutClient
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        businessId={businessId}
        locationId={locationId}
      >
        {children}
      </DashboardLayoutClient>
    </>
  );
}
