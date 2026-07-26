import SignOutButton from "@/components/auth/SignOutButton";
import SideBar from "@/components/layout/dashboard/SideBar";

export default function DashboardPage() {
  return (
    <>
      <SideBar selected={"Overview"}/>

      <main className="p-5">
          <h1>Overview</h1>

          <SignOutButton />
      </main>
    </>
  );
}
