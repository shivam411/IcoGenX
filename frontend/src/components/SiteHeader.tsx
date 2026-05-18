'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import styles from './SiteHeader.module.css';

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [role, setRole] = useState<string>('player');

  const user = session?.user as
    | { id?: string; name?: string; image?: string; isGuest?: boolean }
    | undefined;

  useEffect(() => {
    if (!user?.id) { setRole('player'); return; }
    let cancelled = false;
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!cancelled && d?.user?.role) setRole(d.user.role);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    await signIn('guest', { name, redirect: false });
    setShowGuest(false);
    setGuestName('');
  };

  return (
    <header className={styles.header} role="banner">
      <Link href="/" className={styles.brand} aria-label="Home">
        <span className={styles.logoDot} aria-hidden />
        <span className={styles.brandText}>icoGenX</span>
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        <Link href="/" className={styles.navLink}>Games</Link>
        {user && <Link href="/teams" className={styles.navLink}>Teams</Link>}
        {user && <Link href="/tournaments" className={styles.navLink}>Tournaments</Link>}
        {user && (role === 'admin' || role === 'tournament_manager') && (
          <Link href="/admin" className={styles.navLink}>Admin</Link>
        )}
        {user && <Link href="/profile" className={styles.navLink}>Profile</Link>}
      </nav>

      <div className={styles.userArea}>
        {status === 'loading' ? (
          <div className={styles.skeleton} aria-hidden />
        ) : user ? (
          <div className={styles.userMenu}>
            <button
              type="button"
              className={styles.avatarBtn}
              onClick={() => setOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Account menu for ${user.name ?? 'player'}`}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>{(user.name ?? '?').charAt(0).toUpperCase()}</span>
              )}
              <span className={styles.userName}>
                {user.name ?? 'Player'}
                {user.isGuest && <span className={styles.guestPill}>Guest</span>}
              </span>
            </button>
            {open && (
              <div className={styles.menu} role="menu">
                <Link href="/profile" className={styles.menuItem} role="menuitem" onClick={() => setOpen(false)}>
                  Your profile
                </Link>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => { setOpen(false); void signOut(); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : showGuest ? (
          <form className={styles.guestForm} onSubmit={handleGuest}>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Display name"
              maxLength={32}
              className={styles.guestInput}
              autoFocus
              aria-label="Display name"
            />
            <button type="submit" className={styles.primaryBtn}>Continue</button>
            <button type="button" className={styles.ghostBtn} onClick={() => setShowGuest(false)}>Cancel</button>
          </form>
        ) : (
          <div className={styles.signedOut}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void signIn('google')}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => setShowGuest(true)}
            >
              Play as guest
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
