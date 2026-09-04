import { signIn } from "@/auth";

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
          className="border border-sky-600 rounded p-2 bg-sky-300"
        >
          Signin with Google
        </button>
      </form>
    </>
  );
}
