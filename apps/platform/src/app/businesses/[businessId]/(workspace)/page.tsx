import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user) redirect("/dashboard/login");

  return <div>test</div>;
}
