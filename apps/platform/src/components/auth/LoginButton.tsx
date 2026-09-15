import { signIn } from "@/auth";
import GoogleLogo from "@/components/icons/google-logo.svg";
import Image from "next/image";

export default function LoginButton() {
  return (
    <>
      <form
        action={async () => {
          "use server";
          await signIn("google", {
            redirectTo: "/onboarding",
          });
        }}
      >
        <button
          type="submit"
          className="
            relative
            h-10 w-full
            flex items-center justify-center
            border border-gray-200 shadow-md
            rounded
            px-2
            bg-white
            text-sm font-medium
            text-[#1f1f1f]
            hover:bg-[#f8faff]
          "
        >
          <Image
            src={GoogleLogo}
            alt=""
            aria-hidden="true"
            width={15}
            height={15}
            className="absolute left-3"
          />

          <span>Sign in with Google</span>
        </button>
      </form>
    </>
  );
}
