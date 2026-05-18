'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './AdSlot.module.css';
import { useAdsConsent } from './ConsentBanner';

type SlotShape = 'leaderboard' | 'rectangle' | 'sidebar';

interface Props {
  slotId: string;
  shape?: SlotShape;
  /** Optional human label shown on the placeholder so designers can spot the slot. */
  label?: string;
}

/**
 * Single ad surface. Lobby + homepage + profile only, never on an active game board.
 *
 * Three states:
 *   1. NEXT_PUBLIC_ADSENSE_CLIENT not set       → placeholder
 *   2. set but consent not granted              → placeholder
 *   3. set + consent granted                    → real AdSense, lazy-loaded
 *
 * Always reserves height so layout doesn't shift when ads load.
 */
export default function AdSlot({ slotId, shape = 'rectangle', label }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const consent = useAdsConsent();
  const ref = useRef<HTMLModElement | null>(null);
  const [pushed, setPushed] = useState(false);
  const showReal = !!client && consent === 'granted';

  useEffect(() => {
    if (!showReal || pushed) return;
    try {
      type AdsbygoogleStack = Array<Record<string, unknown>>;
      const win = window as unknown as { adsbygoogle?: AdsbygoogleStack };
      if (!win.adsbygoogle) win.adsbygoogle = [];
      win.adsbygoogle.push({});
      setPushed(true);
    } catch (err) {
      console.warn('[AdSlot] push failed', err);
    }
  }, [showReal, pushed]);

  return (
    <aside className={`${styles.slot} ${styles[shape]}`} aria-label="Advertisement">
      {showReal ? (
        <>
          <Script
            id="adsbygoogle-loader"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
          />
          <ins
            ref={ref}
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={client}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : (
        <div className={styles.placeholder} aria-hidden>
          <span className={styles.tag}>Ad slot</span>
          {label && <span className={styles.label}>{label}</span>}
        </div>
      )}
    </aside>
  );
}
