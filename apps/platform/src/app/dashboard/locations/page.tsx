import SideBar from "@/components/layout/dashboard/SideBar";

export default function LocationsPage() {
    return (
        <>
            <SideBar selected={"Locations"}/>

            <main className="p-5">
                <h1>Locations</h1>
            </main>
        </>
    )
}