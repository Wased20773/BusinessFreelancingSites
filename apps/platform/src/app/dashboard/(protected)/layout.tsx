import { auth } from "@/auth";
import MobileNavBar from "@/components/layout/dashboard/MobileNavBar";
import SideBar from "@/components/layout/dashboard/SideBar";
import { redirect } from "next/navigation";
import { ReactNode } from "react"


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
    
    return (
        <div className="h-screen grid grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] md:grid-rows-1">
            <SideBar />
            <MobileNavBar />

            <main className="min-h-0 overflow-y-scroll p-5">
                {children}
            </main>
        </div>
    )
}