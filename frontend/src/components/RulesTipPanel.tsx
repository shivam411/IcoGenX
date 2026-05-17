'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import styles from './RulesTipPanel.module.css';

const LAST_TIP_STORAGE_PREFIX = 'icogenx_last_tip_';
const TIP_KEY_SEPARATOR = '||';

interface RulesTipPanelProps {
  title?: string;
  rules?: string[] | ReactNode;
  tips?: string[];
  defaultOpen?: boolean;
  compact?: boolean;
  accentColor?: string;
  className?: string;
}

function tipStorageKey(title: string) {
  return `${LAST_TIP_STORAGE_PREFIX}${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function pickRandomTip(title: string, tips: string[]) {
  if (tips.length <= 1 || typeof window === 'undefined') {
    return tips[0] || null;
  }

  const key = tipStorageKey(title);
  let lastTip: string | null = null;
  try {
    lastTip = window.localStorage.getItem(key);
  } catch {
    lastTip = null;
  }

  const candidates = tips.filter((tip) => tip !== lastTip);
  const pool = candidates.length ? candidates : tips;
  const selectedTip = pool[Math.floor(Math.random() * pool.length)] || null;

  if (selectedTip) {
    try {
      window.localStorage.setItem(key, selectedTip);
    } catch {
      // Ignore storage failures; the tip still renders for this visit.
    }
  }

  return selectedTip;
}

export default function RulesTipPanel({
  title = 'Rules',
  rules,
  tips = [],
  defaultOpen = false,
  compact = false,
  accentColor,
  className = '',
}: RulesTipPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [randomTip, setRandomTip] = useState<string | null>(null);
  const tipsKey = tips.join(TIP_KEY_SEPARATOR);

  useEffect(() => {
    const tipOptions = tipsKey ? tipsKey.split(TIP_KEY_SEPARATOR) : [];
    if (!tipOptions.length) {
      setRandomTip(null);
      return;
    }
    setRandomTip(pickRandomTip(title, tipOptions));
  }, [title, tipsKey]);

  const renderedRules = Array.isArray(rules) ? (
    <ul>
      {rules.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  ) : (
    rules
  );

  return (
    <section
      className={`${styles.panel} ${compact ? styles.panelCompact : ''} ${open ? styles.panelOpen : ''} ${className}`}
      style={accentColor ? ({ '--panel-accent': accentColor } as CSSProperties) : undefined}
    >
      <button type="button" className={styles.header} onClick={() => setOpen((value) => !value)}>
        <span className={styles.headerText}>{title}</span>
        <span className={styles.headerAction}>{open ? 'Hide' : 'Show'}</span>
      </button>

      {randomTip && (
        <div className={styles.tipBox}>
          <span className={styles.tipLabel}>Tip</span>
          <span>{randomTip}</span>
        </div>
      )}

      <div className={styles.rulesWrap} aria-hidden={!open}>
        <div className={styles.rulesBody}>{renderedRules}</div>
      </div>
    </section>
  );
}