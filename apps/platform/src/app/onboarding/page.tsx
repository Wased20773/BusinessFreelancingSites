import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnBoardingOptions from "./OnBoardingOptions";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";

export default async function OnBoarding() {
  const session = await auth();

  if (!session?.user) {
    redirect("/dashboard/login");
  }

  if (session.user.onboardingCompleted) {
    redirect("/businesses");
  }

  return (
    <AuthSessionProvider>
      <OnBoardingOptions />
    </AuthSessionProvider>
  );
}
