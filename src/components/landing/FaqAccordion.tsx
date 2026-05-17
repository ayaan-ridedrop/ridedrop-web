'use client';

import { useState } from 'react';

export default function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="max-w-2xl">
      {items.map((it, i) => {
        const open = i === openIdx;
        return (
          <div key={i} className="border-b border-rail">
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className="w-full flex justify-between items-center text-left py-6"
            >
              <span className="font-display font-bold text-base md:text-lg pr-6">
                {it.q}
              </span>
              <span
                className={`text-2xl text-ink-muted transition-transform ${
                  open ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${
                open ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-ink-soft font-light leading-relaxed">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
