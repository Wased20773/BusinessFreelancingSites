import { auth } from "@/auth";
import WorkspaceLayoutClient from "@/components/layout/workspace/WorkspaceLayoutClient";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
import { getPayerLeftNotice } from "@/lib/billing/payerLeftNotice";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

type WorkspaceLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{
    businessId: string;
  }>;
}>;

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!session.user.accessLevel)
    return <div>We were unable to get your access level, please try again</div>;

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
    workspaceTourVersion: session.user.workspaceTourVersion,
  };

  const { businessId } = await params;

  // A banner for owners when the payer left; never break the workspace over it.
  const userId = session.user.id;
  const payerLeftNotice = userId
    ? await getPayerLeftNotice(businessId, userId).catch((error: unknown) => {
        console.error("Failed to check whether the payer left:", error);
        return null;
      })
    : null;

  return (
    <>
      <ResponsiveToaster />

      <WorkspaceLayoutClient
        businessId={businessId}
        currentAccount={currentAccount}
        payerLeftNotice={payerLeftNotice}
      >
        {children}
      </WorkspaceLayoutClient>
    </>
  );
}
