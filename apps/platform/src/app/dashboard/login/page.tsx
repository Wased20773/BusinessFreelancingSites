import { auth } from "@/auth";
import LoginButton from "@/components/auth/LoginButton";
import { redirect } from "next/navigation";
import MaleUsingComputer from "../../../../public/images/male_using_laptop.jpg";
import FemaleUsingComputer from "../../../../public/images/female_using_laptop.jpg";
import Image from "next/image";

export default async function Login() {
  const session = await auth();

  if (session?.user?.businessId) {
    redirect(`/businesses/${session.user.businessId}`);
  }

  if (session?.user) {
    redirect("/businesses");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-stone-200">
      <section className="w-full max-w-[750px] px-5 py-5">
        <div className="hidden md:block">
          <div className="overflow-hidden rounded-2xl grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[auto_auto]">
            <div className="bg-[#C2DBDC] p-5">
              <h1>Login</h1>
              <p className="text-gray-800 mb-3">
                Login using your Google account
              </p>
              {/* List Providers */}
              <div>
                <LoginButton />
              </div>
            </div>
            <div>
              <Image src={MaleUsingComputer} alt="male using computer" />
            </div>
          </div>
        </div>
        <div className="block md:hidden">
          <div className="overflow-hidden rounded-2xl grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[auto_auto]">
            <div>
              <Image src={MaleUsingComputer} alt="male using computer" />
            </div>
            <div className="bg-[#C2DBDC] p-5">
              <h1>Login</h1>
              <p className="text-gray-800 mb-3">
                Login using your Google account
              </p>
              {/* List Providers */}
              <div>
                <LoginButton />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
