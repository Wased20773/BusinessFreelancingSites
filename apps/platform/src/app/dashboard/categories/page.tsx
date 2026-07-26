import SideBar from "@/components/layout/dashboard/SideBar";

export default function CategoriesPage() {
    return (
        <>
            <SideBar selected={"Categories"}/>

            <main className="p-5">
                <h1>Categories</h1>
            </main>
        </>
    )
}