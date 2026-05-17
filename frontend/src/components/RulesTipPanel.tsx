'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import styles from './RulesTipPanel.module.css';

interface RulesTipPanelProps {
  title?: string;
  rules?: string[] | ReactNode;
  tips?: string[];
  defaultOpen?: boolean;
  compact?: boolean;
  accentColor?: string;
  className?: string;
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

  useEffect(() => {
    if (!tips.length) {
      setRandomTip(null);
      return;
    }
    setRandomTip(tips[Math.floor(Math.random() * tips.length)]);
  }, [tips]);

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