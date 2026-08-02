import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | IcoGenX',
  description: 'Terms of Service governing the use of IcoGenX online browser games and room code services.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: 'var(--text-primary, #f8fafc)', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Terms of Service</h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Last Updated: August 2026</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
        <p style={{ color: '#cbd5e1' }}>
          By accessing IcoGenX.com and creating or joining room code lobbies, you agree to these Terms of Service.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>2. Acceptable Use Policy</h2>
        <p style={{ color: '#cbd5e1' }}>
          Players must not attempt to disrupt WebSocket room servers, reverse-engineer proprietary netcode protocols, or upload abusive display names into public game lobbies.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>3. Intellectual Property</h2>
        <p style={{ color: '#cbd5e1' }}>
          Game variant rules, custom UI design components, and brand trademarks are owned by IcoGenX.
        </p>
      </section>
    </main>
  );
}
