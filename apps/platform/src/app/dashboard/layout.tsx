import { ReactNode } from "react"


type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function DashboardLayout({
    children,
}: DashboardLayoutProps) {
    return (
        <div className="grid grid-cols-[auto_1fr] min-h-[100vh]">
            {children}
        </div>
    )
}