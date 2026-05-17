// Login page. Server Component wrapper around the client form.
import Link from 'next/link';
import LoginForm from './LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-10">
          RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <h1 className="text-3xl mb-2">Welcome back.</h1>
        <p className="text-ink-soft text-sm mb-8 font-light">
          Sign in to send a package or list a journey.
        </p>
        <LoginForm next={searchParams.next} initialError={searchParams.error} />
        <p className="text-sm text-ink-soft text-center mt-6 font-light">
          New here?{' '}
          <Link href="/signup" className="text-accent underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
