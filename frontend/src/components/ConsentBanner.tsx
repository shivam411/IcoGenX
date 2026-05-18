'use client';

import { useEffect, useState } from 'react';

/**
 * GDPR/ePrivacy-friendly consent banner. We default to "not yet decided" and
 * gate ad-personalization on the choice. Persists to localStorage so we don't
 * pester the user every visit.
 *
 * Stored value: 'granted' | 'denied' (or absent = unset)
 *
 * Reads consent via {@link useAdsConsent}.
 */
const KEY = 'arena_consent_ads';
type Consent = 'granted' | 'denied' | null;

function readConsent(): Consent {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

export function useAdsConsent(): Consent {
  const [c, setC] = useState<Consent>(null);
  useEffect(() => {
    setC(readConsent());
    const handler = () => setC(readConsent());
    window.addEventListener('storage', handler);
    window.addEventListener('arena:consent-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('arena:consent-changed', handler);
    };
  }, []);
  return c;
}

export default function ConsentBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setConsent(readConsent()); }, []);

  if (!mounted || consent !== null) return null;
  // Don't show the banner if there isn't even an AdSense client configured.
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return null;

  const decide = (value: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(KEY, value);
      window.dispatchEvent(new Event('arena:consent-changed'));
    } catch { /* ignore quota */ }
    setConsent(value);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie and ad consent"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 9999,
        maxWidth: 720, margin: '0 auto',
        background: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(167, 139, 250, 0.4)',
        borderRadius: 12, padding: '14px 16px',
        backdropFilter: 'blur(10px)', color: '#e5e7eb',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        fontSize: 14,
      }}
    >
      <span style={{ flex: '1 1 280px' }}>
        We use cookies and may show personalised ads to keep the site free. You can change this anytime in your profile.
      </span>
      <button
        type="button"
        onClick={() => decide('denied')}
        style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => decide('granted')}
        style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', color: '#0b1020', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
      >
        Accept
      </button>
    </div>
  );
}

/** Helper for the profile page to reset consent. */
export function resetConsent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('arena:consent-changed'));
}
