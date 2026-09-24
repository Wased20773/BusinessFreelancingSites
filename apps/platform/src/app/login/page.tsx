import { auth } from "@/auth";
import LoginButton from "@/components/auth/LoginButton";
import Image from "next/image";
import { redirect } from "next/navigation";
import MaleUsingComputer from "../../../public/images/male_using_laptop.jpg";
import BPLogo from "../../../public/logo.svg";

export default async function Login() {
  const session = await auth();

  if (session?.user?.businessId) {
    redirect(`/businesses/${session.user.businessId}`);
  }

  if (session?.user) {
    redirect("/businesses");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section
        aria-labelledby="login-heading"
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl shadow-gray-200 md:min-h-[520px] md:grid-cols-2"
      >
        <div className="relative h-44 overflow-hidden bg-slate-200 sm:h-56 md:order-2 md:h-auto">
          <Image
            src={MaleUsingComputer}
            alt="Person working on a laptop"
            fill
            priority
            sizes="(min-width: 768px) 448px, 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent md:bg-gradient-to-r md:from-slate-950/20 md:to-transparent" />
        </div>

        <div className="flex flex-col justify-center p-5 sm:px-8 sm:py-5 md:px-12">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src={BPLogo}
              alt=""
              aria-hidden="true"
              width={50}
              height={50}
            />
            <span className="text-lg font-semibold tracking-wide text-slate-800">
              Business Platform
            </span>
          </div>

          <div className="max-w-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
              Your workspace
            </p>
            <h1
              id="login-heading"
              className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
            >
              Welcome back
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Sign in with your Google account to manage your businesses and
              locations.
            </p>

            <div className="mt-8">
              <LoginButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
