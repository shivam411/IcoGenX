import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '72px', color: 'var(--brand-accent, #8b5cf6)', marginBottom: '8px' }}>404</h1>
      <h2 style={{ fontSize: '28px', marginBottom: '16px' }}>Game Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '32px', maxWidth: '480px' }}>
        The game room, variant, or page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="btn btn-primary" style={{ padding: '12px 24px', textDecoration: 'none' }}>
        🎮 Return to All Games
      </Link>
    </main>
  );
}
