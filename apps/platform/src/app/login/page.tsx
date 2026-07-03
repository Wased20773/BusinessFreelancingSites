import { signIn } from '@/auth';

export default function LoginPage() {
    return (
        <main
            className='mx-auto'
        >
            <h1
                className='mb-5'
            >Login</h1>

            <form
                action={async () => {
                    'use server';
                    await signIn('google', {
                        redirectTo: '/',
                    });
                }}
            >
                <button
                    type='submit'
                    className='border border-sky-600 rounded p-2 bg-sky-300'
                >Signin with Google</button>
            </form>
        </main>
    )
}