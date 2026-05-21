'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CelebrationProps {
  type: 'series' | 'tournament';
  winnerName: string;
  onComplete?: () => void;
}

interface Confetti {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  shape: 'rect' | 'circle';
}

interface Rocket {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  color: string;
  exploded: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  wobble?: number;
  wobbleSpeed?: number;
}

export function Celebration({ type, winnerName, onComplete }: CelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Curated premium palettes
  const standardColors = [
    '#ff3b30', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#ff2d55',
    '#e040fb', '#00e5ff', '#a7ffeb', '#ff1744', '#f50057', '#d500f9', '#651fff', '#3d5afe'
  ];
  const goldColors = [
    '#ffd700', '#ffdf7a', '#ffea9f', '#d4af37', '#aa7c11', '#8c6204', // gold
    '#c0c0c0', '#e6e6e6', '#d9d9d9', '#a6a6a6',                      // silver
    '#cd7f32', '#d2691e', '#b87333'                                  // bronze
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle state
    const confettis: Confetti[] = [];
    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];

    // Helper for random choices
    const random = (min: number, max: number) => Math.random() * (max - min) + min;
    const choice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Initialize confetti
    const colors = type === 'tournament' ? [...goldColors, ...standardColors] : standardColors;
    const confettiCount = type === 'tournament' ? 220 : 130;

    for (let i = 0; i < confettiCount; i++) {
      confettis.push({
        x: random(0, width),
        y: random(-height * 0.5, 0),
        w: random(8, 15),
        h: random(5, 10),
        color: choice(colors),
        vx: random(-2, 2),
        vy: random(2, 6),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-0.1, 0.1),
        wobble: random(0, Math.PI * 2),
        wobbleSpeed: random(0.05, 0.15),
        shape: Math.random() > 0.3 ? 'rect' : 'circle',
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Rocket generation rate: periodic launchers
    let lastRocketTime = 0;
    const rocketInterval = type === 'tournament' ? 250 : 500; // ms between rockets

    const spawnRocket = () => {
      const startX = random(width * 0.15, width * 0.85);
      const startY = height;
      const targetX = random(width * 0.1, width * 0.9);
      const targetY = random(height * 0.15, height * 0.55);

      const dx = targetX - startX;
      const dy = targetY - startY;
      const angle = Math.atan2(dy, dx);
      // Faster rockets for tournaments
      const speed = type === 'tournament' ? random(14, 20) : random(11, 15);

      const colorsToUse = type === 'tournament' ? goldColors : standardColors;

      rockets.push({
        x: startX,
        y: startY,
        tx: targetX,
        ty: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: choice(colorsToUse),
        exploded: false,
        trail: [],
      });
    };

    const explodeRocket = (rocket: Rocket) => {
      const sparkCount = type === 'tournament' ? random(80, 130) : random(45, 75);
      const colorsToUse = type === 'tournament' ? goldColors : [rocket.color, choice(standardColors)];

      for (let i = 0; i < sparkCount; i++) {
        const angle = random(0, Math.PI * 2);
        const speed = random(1.5, type === 'tournament' ? 7.5 : 5.0);
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * speed + random(-0.3, 0.3),
          vy: Math.sin(angle) * speed + random(-0.3, 0.3),
          color: choice(colorsToUse),
          alpha: 1.0,
          decay: random(0.01, 0.022),
          gravity: 0.06,
          wobble: random(0, Math.PI * 2),
          wobbleSpeed: random(0.1, 0.3),
        });
      }
    };

    // Fade-in overlay text shortly after celebration start
    const overlayTimer = setTimeout(() => {
      setShowOverlay(true);
    }, 500);

    // Animation Loop
    const tick = (timestamp: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. CONFETTI PHYSICS & DRAW
      for (let i = 0; i < confettis.length; i++) {
        const c = confettis[i];
        c.y += c.vy;
        c.x += c.vx + Math.sin(c.wobble) * 0.5;
        c.rotation += c.rotationSpeed;
        c.wobble += c.wobbleSpeed;

        // Reset if goes off screen
        if (c.y > height) {
          c.y = -20;
          c.x = random(0, width);
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;

        if (c.shape === 'rect') {
          ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, c.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. ROCKET PHYSICS & DRAW
      if (timestamp - lastRocketTime > rocketInterval) {
        spawnRocket();
        lastRocketTime = timestamp;
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];

        // Track trail
        r.trail.push({ x: r.x, y: r.y, alpha: 1.0 });
        if (r.trail.length > 12) r.trail.shift();

        // Draw trail
        for (let j = 0; j < r.trail.length; j++) {
          const pt = r.trail[j];
          pt.alpha -= 0.07;
          if (pt.alpha > 0) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 235, 150, ${pt.alpha})`;
            ctx.fill();
          }
        }

        // Apply speed
        r.x += r.vx;
        r.y += r.vy;

        // Decelerate slightly
        r.vx *= 0.985;
        r.vy += 0.08; // subtle gravity pulls upwards rocket

        // Explode condition: close to target or slowing down significantly
        const reachedTarget = r.vy >= 0 || r.y <= r.ty;

        if (reachedTarget) {
          explodeRocket(r);
          rockets.splice(i, 1);
        } else {
          // Draw rocket tip
          ctx.beginPath();
          ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.fill();
        }
      }

      // 3. SPARKS PHYSICS & DRAW
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += s.gravity;
        s.alpha -= s.decay;

        if (s.wobble !== undefined && s.wobbleSpeed !== undefined) {
          s.wobble += s.wobbleSpeed;
          s.x += Math.sin(s.wobble) * 0.4;
        }

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, random(1.5, type === 'tournament' ? 3.5 : 2.5), 0, Math.PI * 2);
          // Apply glow effect for premium design
          ctx.shadowBlur = type === 'tournament' ? 12 : 5;
          ctx.shadowColor = s.color;
          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.alpha;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
          ctx.globalAlpha = 1.0; // reset
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(overlayTimer);
    };
  }, [type]);

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />

      {showOverlay && (
        <div style={styles.overlayContainer}>
          {type === 'tournament' ? (
            <div style={styles.trophyWrapper} className="animate-fade-in-up">
              {/* Grand golden floating trophy */}
              <div style={styles.trophyGlow} />
              <svg
                style={styles.trophyIcon}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff3a1" />
                    <stop offset="50%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#aa7c11" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 9H15V7H9V9H7V11C7 12.66 8.34 14 10 14V17H8V19H16V17H14V14C15.66 14 17 12.66 17 11V9ZM9.5 12V9H14.5V12H9.5Z"
                  fill="url(#goldGradient)"
                />
              </svg>

              <h2 style={styles.tournamentSub}>TOURNAMENT CHAMPION</h2>
              <h1 style={styles.winnerNameText}>{winnerName}</h1>
              <p style={styles.congratsQuote}>"Victory belongs to the most persevering."</p>

              <button style={styles.closeBtn} onClick={onComplete}>
                Continue
              </button>
            </div>
          ) : (
            <div style={styles.seriesWrapper} className="animate-fade-in-up">
              <div style={styles.seriesMedal}>
                <svg
                  style={styles.medalIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="medalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c2e9fb" />
                      <stop offset="100%" stopColor="#a1c4fd" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="url(#medalGradient)"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              <h2 style={styles.seriesSub}>SERIES VICTORY</h2>
              <h1 style={styles.seriesWinnerName}>{winnerName} Wins!</h1>
              <p style={styles.seriesScoreText}>Winner of the 5-Match Series</p>

              <button style={styles.seriesCloseBtn} onClick={onComplete}>
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline styles for high-fidelity overlays
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: 9999,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    backgroundColor: 'rgba(10, 8, 20, 0.35)',
    backdropFilter: 'blur(3px)',
  },
  trophyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 4rem',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(30, 24, 10, 0.9) 0%, rgba(15, 12, 5, 0.95) 100%)',
    border: '2px solid rgba(255, 215, 0, 0.4)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.15)',
    textAlign: 'center',
    maxWidth: '500px',
    position: 'relative',
  },
  trophyGlow: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0) 70%)',
    zIndex: -1,
  },
  trophyIcon: {
    width: '120px',
    height: '120px',
    marginBottom: '1.5rem',
    filter: 'drop-shadow(0 8px 16px rgba(255, 215, 0, 0.4))',
  },
  tournamentSub: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffdf7a',
    letterSpacing: '5px',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
  },
  winnerNameText: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontSize: '3.2rem',
    fontWeight: 800,
    background: 'linear-gradient(to right, #fff, #ffd700, #ffdf7a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 1rem 0',
    letterSpacing: '1px',
    filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))',
  },
  congratsQuote: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1rem',
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 2rem 0',
  },
  closeBtn: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    backgroundColor: '#ffd700',
    color: '#151005',
    border: 'none',
    padding: '0.8rem 2.2rem',
    borderRadius: '30px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },

  // Series styles
  seriesWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 3.5rem',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(20, 25, 45, 0.9) 0%, rgba(10, 12, 25, 0.95) 100%)',
    border: '2px solid rgba(161, 196, 253, 0.3)',
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(161, 196, 253, 0.1)',
    textAlign: 'center',
    maxWidth: '450px',
  },
  seriesMedal: {
    width: '80px',
    height: '80px',
    marginBottom: '1rem',
    filter: 'drop-shadow(0 5px 12px rgba(161, 196, 253, 0.4))',
  },
  medalIcon: {
    width: '100%',
    height: '100%',
  },
  seriesSub: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#a1c4fd',
    letterSpacing: '4px',
    margin: '0 0 0.5rem 0',
    textTransform: 'uppercase',
  },
  seriesWinnerName: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontSize: '2.4rem',
    fontWeight: 800,
    background: 'linear-gradient(to right, #ffffff, #c2e9fb, #a1c4fd)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '0 0 0.5rem 0',
  },
  seriesScoreText: {
    fontFamily: '"Inter", sans-serif',
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.75)',
    margin: '0 0 1.8rem 0',
  },
  seriesCloseBtn: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    background: 'linear-gradient(to right, #c2e9fb 0%, #a1c4fd 100%)',
    color: '#0a0d1a',
    border: 'none',
    padding: '0.7rem 2rem',
    borderRadius: '30px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(161, 196, 253, 0.3)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
};
