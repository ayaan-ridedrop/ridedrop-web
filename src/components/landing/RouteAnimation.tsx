'use client';

// Hero-right train route animation. Three stops + an animated "package card".
// Pure CSS animations — no library.

export default function RouteAnimation() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col">
        <Stop city="London" sub="Package collected 09:14" />
        <Line />
        <Stop city="Birmingham" sub="Passing through" dim />
        <Line dim />
        <Stop city="Manchester" sub="Delivered by 11:32" />
      </div>

      <div className="ml-12 mt-4 bg-white rounded-2xl p-4 shadow-lg max-w-[260px] animate-card-in">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium bg-accent-light text-accent px-2.5 py-0.5 rounded-full">
            In transit
          </span>
          <span className="font-display font-bold text-lg">£28</span>
        </div>
        <div className="text-xs text-ink-muted mb-3">London → Manchester · 2h 18m</div>
        <div className="flex items-center gap-2 pt-3 border-t border-rail">
          <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center text-[11px] font-bold text-accent">
            JT
          </div>
          <div className="text-xs text-ink-soft">
            James T. · Verified carrier
            <br />
            <span className="text-accent-mid text-[11px]">★★★★★</span>{' '}
            <span className="text-ink-muted text-[10px]">4.9 (47 reviews)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-card-in {
          opacity: 0;
          animation: cardIn 0.6s ease 0.9s forwards;
        }
      `}</style>
    </div>
  );
}

function Stop({ city, sub, dim }: { city: string; sub: string; dim?: boolean }) {
  return (
    <div className="flex items-center gap-4 py-4 animate-stop-in">
      <div
        className={`w-3.5 h-3.5 rounded-full shrink-0 ${
          dim ? 'bg-rail-dark ring-4 ring-rail' : 'bg-accent ring-4 ring-accent-light'
        }`}
      />
      <div>
        <div className={`font-display font-bold text-[15px] ${dim ? 'text-ink-muted' : ''}`}>
          {city}
        </div>
        <div className="text-[12px] text-ink-muted mt-0.5">{sub}</div>
      </div>
      <style jsx>{`
        @keyframes stopIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-stop-in {
          opacity: 0;
          animation: stopIn 0.6s ease forwards;
        }
      `}</style>
    </div>
  );
}

function Line({ dim }: { dim?: boolean }) {
  return (
    <div className="flex items-center gap-4 px-1.5">
      <div
        className="w-0.5 h-12 ml-1"
        style={{
          background: dim
            ? 'repeating-linear-gradient(to bottom, #C8C2B4 0, #C8C2B4 6px, transparent 6px, transparent 12px)'
            : 'repeating-linear-gradient(to bottom, #1B4332 0, #1B4332 6px, transparent 6px, transparent 12px)',
        }}
      />
    </div>
  );
}
