import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | IcoGenX',
  description: 'IcoGenX Privacy Policy. Learn how we protect player anonymity and handle room session data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', color: 'var(--text-primary, #f8fafc)', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Privacy Policy</h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Last Updated: August 2026</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>1. Data Privacy Guarantee</h2>
        <p style={{ color: '#cbd5e1' }}>
          IcoGenX respects player privacy. We do NOT require email registration or personal identifiers to play our 2-player browser games. Anonymous display names and 6-character room codes are processed temporarily in memory solely to coordinate real-time game state synchronization.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>2. Cookies &amp; Local Storage</h2>
        <p style={{ color: '#cbd5e1' }}>
          We use browser LocalStorage strictly to preserve your chosen player name and game preferences locally on your device. We do not sell player data or use invasive third-party cross-site trackers.
        </p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>3. Contact Regarding Data</h2>
        <p style={{ color: '#cbd5e1' }}>
          For questions regarding data handling, contact us at <code>privacy@icogenx.com</code>.
        </p>
      </section>
    </main>
  );
}
