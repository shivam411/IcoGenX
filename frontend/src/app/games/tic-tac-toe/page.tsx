import { Metadata } from 'next';
import Link from 'next/link';
import TicTacToeClientPage from './TicTacToeClientPage';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Disappearing Tic-Tac-Toe Online (2 Player) | IcoGenX',
    description: 'Play Disappearing Tic-Tac-Toe online with friends. Keep up to 4 marks in play before your oldest vanishes. Free 2-player browser game, no download required.',
    alternates: {
      canonical: '/games/tic-tac-toe',
    },
    openGraph: {
      title: 'Disappearing Tic-Tac-Toe Online (2 Player) | IcoGenX',
      description: 'Challenge friends to Disappearing Tic-Tac-Toe in your browser with instant room codes.',
      url: 'https://icogenx.com/games/tic-tac-toe',
      siteName: 'IcoGenX',
      images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'Disappearing Tic-Tac-Toe Online 2 Player' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Disappearing Tic-Tac-Toe Online (2 Player) | IcoGenX',
      description: 'Play Disappearing Tic-Tac-Toe online with friends.',
    },
  };
}

export default function TicTacToePage() {
  const gameSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        'name': 'Disappearing Tic-Tac-Toe Online',
        'applicationCategory': 'GameApplication',
        'operatingSystem': 'Web Browser',
        'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      },
      {
        '@type': 'VideoGame',
        'name': 'Disappearing Tic-Tac-Toe',
        'description': 'Play Disappearing Tic-Tac-Toe online with friends in real time. Max 4 active marks before your oldest vanishes.',
        'genre': ['Strategy', 'Board Game', 'Multiplayer'],
        'numberOfPlayers': { '@type': 'QuantitativeValue', 'minValue': 2, 'maxValue': 2 },
      },
      {
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Can Disappearing Tic-Tac-Toe end in a draw?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'No! Because pieces vanish after the 4th placement, the board never locks up, guaranteeing a winner in every match.',
            },
          },
          {
            '@type': 'Question',
            'name': 'Is this game free to play with friends?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes, all games on IcoGenX are 100% free with no install, registration, or app required.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }}
      />
      <TicTacToeClientPage />

      {/* Pre-rendered Server-Side SEO Content */}
      <section style={{ maxWidth: '840px', margin: '60px auto', padding: '0 20px', color: 'var(--text-primary, #f8fafc)', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Disappearing Tic-Tac-Toe – Free Online 2-Player Game</h1>
        <p style={{ color: '#cbd5e1', marginBottom: '24px' }}>
          In <strong>Disappearing Tic-Tac-Toe</strong>, traditional draw games are impossible. Each player can keep a maximum of 4 marks on the 3x3 grid at any time. When you place your 5th mark, your very first mark automatically vanishes from the board.
        </p>

        <h2 style={{ fontSize: '22px', marginTop: '32px', marginBottom: '12px' }}>How to Play Disappearing Tic-Tac-Toe Online</h2>
        <ol style={{ paddingLeft: '20px', color: '#cbd5e1' }}>
          <li style={{ marginBottom: '8px' }}><strong>Create a Free Room:</strong> Click 'Create Room' to generate a private 6-character room code.</li>
          <li style={{ marginBottom: '8px' }}><strong>Share with a Friend:</strong> Send the room link to your friend on mobile or desktop. No sign-up required.</li>
          <li style={{ marginBottom: '8px' }}><strong>Time Your Lines:</strong> Track the order of your placed marks so your winning line doesn't vanish mid-turn!</li>
        </ol>

        <h2 style={{ fontSize: '22px', marginTop: '32px', marginBottom: '12px' }}>Rules &amp; Winning Tactics</h2>
        <ul style={{ paddingLeft: '20px', color: '#cbd5e1' }}>
          <li style={{ marginBottom: '8px' }}><strong>Track Vanishing Sequence:</strong> Always remember which cell holds your oldest mark before setting up a 3-in-a-row threat.</li>
          <li style={{ marginBottom: '8px' }}><strong>Force Traps:</strong> Bait your opponent into filling a cell that forces their defensive mark to vanish on their next move.</li>
          <li style={{ marginBottom: '8px' }}><strong>Control Center &amp; Corners:</strong> Corner cells offer the most diagonal fork setups, while the center cell touches four potential winning lines.</li>
        </ul>

        <h2 style={{ fontSize: '22px', marginTop: '32px', marginBottom: '16px' }}>Explore Related Game Variants</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}><Link href="/games/drop-four" style={{ color: '#06b6d4' }}>Drop Four Chaos (Connect 4)</Link></h3>
            <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>Connect four in a vertical grid with gravity flips and popouts.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}><Link href="/games/code-guess" style={{ color: '#06b6d4' }}>Code Breaker 4-Digit</Link></h3>
            <p style={{ fontSize: '13px', margin: 0, color: '#94a3b8' }}>Crack your opponent secret 4-digit code using logic clues.</p>
          </div>
        </div>
      </section>
    </>
  );
}
