import { auth } from "@/auth";
import LoginButton from "@/components/auth/LoginButton";
import { redirect } from "next/navigation";

export default async function Login() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
        <section>
          <h1>Login</h1>
          <p>Login using your Google account</p>
          <LoginButton />
        </section>
    </main>
  );
}
