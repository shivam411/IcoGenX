import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About IcoGenX | Next Generation Indie Multiplayer Gaming',
  description: 'Learn about IcoGenX, our mission to build fast, friction-free 2-player browser games powered by Rust & Next.js.',
  alternates: {
    canonical: '/about',
  },
};

export default function AboutPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: 'var(--text-primary, #f8fafc)' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>About IcoGenX</h1>
      <p style={{ fontSize: '18px', lineHeight: '1.6', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '32px' }}>
        IcoGenX is an indie browser gaming platform built for friends, couples, and casual gamers who want instant, real-time multiplayer matches without downloading apps or creating accounts.
      </p>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Our Engineering Philosophy</h2>
        <p style={{ lineHeight: '1.6', color: 'var(--text-secondary, #cbd5e1)' }}>
          Traditional browser games are often bloated with intrusive ads, slow load times, and mandatory account registration. 
          We built IcoGenX using high-performance <strong>Rust WebSockets</strong> and <strong>Next.js 16</strong> to deliver instant room creation and smooth real-time game state synchronization.
        </p>
      </section>

      <section style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Platform Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div><h3 style={{ fontSize: '28px', color: '#8b5cf6', margin: '0 0 4px 0' }}>36+</h3><p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Free Games</p></div>
          <div><h3 style={{ fontSize: '28px', color: '#06b6d4', margin: '0 0 4px 0' }}>30+</h3><p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Game Variants</p></div>
          <div><h3 style={{ fontSize: '28px', color: '#10b981', margin: '0 0 4px 0' }}>Instant</h3><p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Room Codes</p></div>
          <div><h3 style={{ fontSize: '28px', color: '#ec4899', margin: '0 0 4px 0' }}>100%</h3><p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Frictionless</p></div>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Meet the Developer</h2>
        <p style={{ lineHeight: '1.6', color: 'var(--text-secondary, #cbd5e1)' }}>
          IcoGenX was designed and engineered by <strong>Shivam</strong>, a full-stack developer passionate about combinatorial game theory, low-latency netcode, and tactical twists on classic board games like <em>Disappearing Tic-Tac-Toe</em> and <em>Drop Four Chaos</em>.
        </p>
      </section>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <Link href="/" className="btn btn-primary" style={{ padding: '12px 28px', textDecoration: 'none', borderRadius: '8px' }}>
          🎮 Explore All Games
        </Link>
      </div>
    </main>
  );
}
