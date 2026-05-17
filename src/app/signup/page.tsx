import Link from 'next/link';
import SignupForm from './SignupForm';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-extrabold text-2xl block mb-10">
          RideDrop<span className="text-accent-mid">.</span>
        </Link>
        <h1 className="text-3xl mb-2">Create your account.</h1>
        <p className="text-ink-soft text-sm mb-8 font-light">
          Send packages, carry packages, or both. You can switch any time.
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
