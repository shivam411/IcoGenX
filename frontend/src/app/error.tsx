'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <main style={{ textAlign: 'center', padding: '100px 20px', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>Something Went Wrong</h1>
      <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '24px', maxWidth: '480px' }}>
        We encountered a temporary error while connecting to the game room server.
      </p>
      <button onClick={() => reset()} className="btn btn-primary" style={{ padding: '12px 24px' }}>
        🔄 Try Again
      </button>
    </main>
  );
}
