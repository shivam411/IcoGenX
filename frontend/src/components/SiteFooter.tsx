import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer style={{ background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '60px 20px 30px 20px', color: '#94a3b8', fontSize: '14px', marginTop: '80px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', marginBottom: '40px' }}>
        
        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px' }}>2-Player Strategy Games</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
            <li><Link href="/games/tic-tac-toe" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Disappearing Tic-Tac-Toe</Link></li>
            <li><Link href="/games/checkers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Checkers Minefield</Link></li>
            <li><Link href="/games/drop-four" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Drop Four Chaos (Connect 4)</Link></li>
            <li><Link href="/games/smart-four" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Smart Four 3D</Link></li>
            <li><Link href="/games/black-hole" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Black Hole Strategy</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px' }}>Logic &amp; Deduction</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
            <li><Link href="/games/code-guess" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Code Breaker 4-Digit</Link></li>
            <li><Link href="/games/higher-lower" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Higher or Lower Sprint</Link></li>
            <li><Link href="/games/dr-eureka" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Dr. Eureka Sorting</Link></li>
            <li><Link href="/games/dice-grid" style={{ color: '#cbd5e1', textDecoration: 'none' }}>The Dice Grid</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px' }}>Reflex &amp; Party</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
            <li><Link href="/games/stop-clock" style={{ color: '#cbd5e1', textDecoration: 'none' }}>20-Second Challenge</Link></li>
            <li><Link href="/games/memory-flip" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Sequence Memory Flip</Link></li>
            <li><Link href="/games/trivia-battle" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Trivia Battle Quiz</Link></li>
            <li><Link href="/games/bluff-card" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Bluff Card Game</Link></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px' }}>Company &amp; Trust</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
            <li><Link href="/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>About Us</Link></li>
            <li><Link href="/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Contact &amp; Support</Link></li>
            <li><Link href="/privacy" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Privacy Policy</Link></li>
            <li><Link href="/terms" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Terms of Service</Link></li>
            <li><Link href="/tournaments" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Tournaments</Link></li>
          </ul>
        </div>

      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '24px', textAlign: 'center', fontSize: '13px' }}>
        <p>© 2026 IcoGenX. Free 2-Player Online Browser Games. Instant room codes, zero downloads.</p>
      </div>
    </footer>
  );
}
