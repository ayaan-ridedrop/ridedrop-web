// Dynamically-rendered OpenGraph image for the landing page.
// Next.js renders this to a PNG at build/request time using @vercel/og.
// 1200×630 is the canonical OG size — looks right in WhatsApp, Twitter,
// LinkedIn, Slack.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RideDrop — Train-powered delivery across the UK';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F7F4EF',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2, color: '#0D0D0D' }}>
          RideDrop<span style={{ color: '#52B788' }}>.</span>
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 1,
            color: '#0D0D0D',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <div>Someone's already</div>
          <div>
            going <span style={{ color: '#52B788' }}>your way.</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            color: '#3A3A3A',
          }}
        >
          <span>Train-powered delivery between UK cities.</span>
          <span
            style={{
              background: '#0D0D0D',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            Get started
          </span>
        </div>
      </div>
    ),
    size,
  );
}
