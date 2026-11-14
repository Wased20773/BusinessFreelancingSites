import { auth } from "@/auth";
import DashboardLayoutClient from "@/components/layout/dashboard/DashboardLayoutClient";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
import { SyncAccessProvider } from "@/components/providers/SyncAccessProvider";
import { getBusinessPlan } from "@/lib/billing/getBusinessPlan";
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
    redirect("/login");
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
    imageKey: session.user.businessImageKey || null,
  };

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
    dashboardTourVersion: session.user.dashboardTourVersion,
  };

  const { businessId, locationId } = await params;

  /*
   * Sync is a paid feature: the forms' sync toggles are locked on Free.
   * If the check fails, leave them unlocked; the server still enforces it.
   */
  const syncEnabled = await getBusinessPlan(businessId)
    .then((plan) => plan.limits.sync)
    .catch((error: unknown) => {
      console.error("Failed to load the business plan:", error);
      return true;
    });

  return (
    <>
      <ResponsiveToaster />

      <DashboardLayoutClient
        currentBusiness={currentBusiness}
        currentAccount={currentAccount}
        businessId={businessId}
        locationId={locationId}
      >
        <SyncAccessProvider
          syncEnabled={syncEnabled}
          billingHref={`/businesses/${businessId}/billing`}
        >
          {children}
        </SyncAccessProvider>
      </DashboardLayoutClient>
    </>
  );
}
