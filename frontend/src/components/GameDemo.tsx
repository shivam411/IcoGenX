'use client';

import { useState, useEffect } from 'react';
import styles from './GameDemo.module.css';

interface DemoStep {
  board: (string | null)[];
  fading?: number;
  joker?: number;
  message: string;
}

interface GameDemoProps {
  steps: DemoStep[];
  intervalMs?: number;
}

export default function GameDemo({ steps, intervalMs = 2000 }: GameDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [steps, intervalMs]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className={styles.demoContainer}>
      <div className={styles.board}>
        {step.board.map((cell, idx) => {
          let className = styles.cell;
          if (cell === 'X') className += ` ${styles.cellX}`;
          else if (cell === 'O') className += ` ${styles.cellO}`;
          
          if (step.fading === idx) className += ` ${styles.cellFading}`;
          if (step.joker === idx) className += ` ${styles.cellJoker}`;

          return (
            <div key={idx} className={className}>
              {cell === 'J' ? '🃏' : cell}
            </div>
          );
        })}
      </div>
      <div className={styles.messageContainer}>
        <p className={styles.message}>{step.message}</p>
        <div className={styles.progressDots}>
          {steps.map((_, i) => (
            <span 
              key={i} 
              className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
