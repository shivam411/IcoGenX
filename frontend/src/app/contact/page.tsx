import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Support & Feedback | IcoGenX',
  description: 'Get in touch with the IcoGenX team for bug reports, game feedback, or developer inquiries.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  return (
    <main style={{ maxWidth: '700px', margin: '0 auto', padding: '60px 20px', color: 'var(--text-primary, #f8fafc)' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>Contact &amp; Support</h1>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '32px' }}>
        Have feedback, discovered a room code bug, or want to suggest a new game variant? We would love to hear from you.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Direct Support Email</h2>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '16px' }}>
          For general inquiries, netcode feedback, or press:
        </p>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#8b5cf6' }}>
          support@icogenx.com
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Bug Reports &amp; Open Source</h2>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', marginBottom: '16px' }}>
          If you encounter a game state glitch or connection error, report it directly on our GitHub repository:
        </p>
        <a 
          href="https://github.com/shivam411/IcoGenX/issues" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#06b6d4', textDecoration: 'underline' }}
        >
          Submit an issue on GitHub →
        </a>
      </div>
    </main>
  );
}
