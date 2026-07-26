import SideBar from "@/components/layout/dashboard/SideBar";

export default function UsersPage() {
    return (
        <>
            <SideBar selected={"Users"}/>
            
            <main className="p-5">
                <h1>Users</h1>
            </main>
        </>
    )
}