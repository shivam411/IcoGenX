'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdSlot.module.css';

type SlotShape = 'leaderboard' | 'rectangle' | 'sidebar';

interface Props {
  slotId: string;
  shape?: SlotShape;
  /** Optional human label shown on the placeholder so designers can spot the slot. */
  label?: string;
}

/**
 * Single ad surface. Designed for low-density placement: lobby + homepage only,
 * never on an active game board. Renders a reserved-size placeholder until
 * NEXT_PUBLIC_ADSENSE_CLIENT is set, then loads the real script lazily.
 *
 * We always reserve the slot's height so layout doesn't shift when ads load.
 */
export default function AdSlot({ slotId, shape = 'rectangle', label }: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const ref = useRef<HTMLModElement | null>(null);
  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    if (!client || pushed) return;
    try {
      type AdsbygoogleStack = Array<Record<string, unknown>>;
      const win = window as unknown as { adsbygoogle?: AdsbygoogleStack };
      if (!win.adsbygoogle) win.adsbygoogle = [];
      win.adsbygoogle.push({});
      setPushed(true);
    } catch (err) {
      console.warn('[AdSlot] push failed', err);
    }
  }, [client, pushed]);

  return (
    <aside className={`${styles.slot} ${styles[shape]}`} aria-label="Advertisement">
      {client ? (
        <ins
          ref={ref}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={client}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className={styles.placeholder} aria-hidden>
          <span className={styles.tag}>Ad slot</span>
          {label && <span className={styles.label}>{label}</span>}
        </div>
      )}
    </aside>
  );
}
