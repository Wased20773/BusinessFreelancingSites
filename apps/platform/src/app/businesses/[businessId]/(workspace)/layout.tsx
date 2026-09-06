import { auth } from "@/auth";
import WorkspaceLayoutClient from "@/components/layout/workspace/WorkspaceLayoutClient";
import ResponsiveToaster from "@/components/ui/ResponsiveToast";
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

  if (!session?.user) redirect("/dashboard/login");
  if (!session.user.accessLevel)
    return <div>We were unable to get your access level, please try again</div>;

  const currentAccount = {
    name: session.user.name,
    image: session.user.image,
    accessLevel: session.user.accessLevel,
  };

  const { businessId } = await params;

  return (
    <>
      <ResponsiveToaster />

      <WorkspaceLayoutClient
        businessId={businessId}
        currentAccount={currentAccount}
      >
        {children}
      </WorkspaceLayoutClient>
    </>
  );
}
