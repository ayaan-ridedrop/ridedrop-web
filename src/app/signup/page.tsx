import Link from 'next/link';
import SignupForm from './SignupForm';

export const metadata = {
  title: 'Sign up | RideDrop',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-10">
          <img src="/logo-mark.png" alt="" className="inline-block h-[1.15em] w-[1.15em] rounded-[24%] mr-[0.35em] align-[-0.18em]" />RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <h1 className="text-3xl mb-2">Create your account.</h1>
        <p className="text-ink-soft text-sm mb-8 font-light">
          Join RideDrop as a sender or carrier.
        </p>
        <SignupForm />
        <p className="text-sm text-ink-soft text-center mt-6 font-light">
          Already have an account?{' '}
          <Link href="/login" className="text-accent underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
