import { signOut } from "@/auth";

export default function SignOut() {
  return (
    <form
        action={async () => {
            "use server";
            await signOut({
                redirectTo: "/login",
            });
        }}
    >
        <button
            type='submit'
            className='border border-sky-600 rounded p-2 bg-sky-300'
        >Sign out</button>
    </form>
  );
}