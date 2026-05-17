// Shared shell for any authenticated page.
// Desktop: top nav. Mobile: top mini-bar + bottom tab bar (native-feeling).
import Link from 'next/link';

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { email: string; firstName?: string | null };
}) {
  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      {/* TOP NAV */}
      <nav className="border-b border-rail bg-white/85 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <Link href="/dashboard" className="font-display font-extrabold text-xl">
            RideDrop<span className="text-accent-mid">.</span>
          </Link>

          {/* Desktop-only links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-ink-soft">
            <Link href="/dashboard" className="hover:text-ink">Home</Link>
            <Link href="/send" className="hover:text-ink">Send</Link>
            <Link href="/jobs/browse" className="hover:text-ink">Find jobs</Link>
            <Link href="/journeys/new" className="hover:text-ink">List a journey</Link>
            <Link href="/bookings" className="hover:text-ink">Bookings</Link>
            <Link href="/earnings" className="hover:text-ink">Earnings</Link>
            <Link href="/notifications" className="hover:text-ink" aria-label="Activity">🔔</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-ink-soft hover:text-ink truncate max-w-[140px]"
            >
              {user.firstName ?? user.email}
            </Link>
            <form action="/logout" method="POST">
              <button className="text-sm text-ink-muted hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 md:py-10">
        {children}
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-rail z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 text-center text-[10px] font-medium text-ink-muted">
          <Tab href="/dashboard" icon="🏠" label="Home" />
          <Tab href="/send" icon="➕" label="Send" />
          <Tab href="/bookings" icon="📍" label="Bookings" />
          <Tab href="/notifications" icon="🔔" label="Activity" />
          <Tab href="/profile" icon="👤" label="Me" />
        </div>
      </nav>
    </div>
  );
}

function Tab({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center py-2.5 hover:text-ink">
      <span className="text-xl">{icon}</span>
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}
