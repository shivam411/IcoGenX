'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { getGamePath, useGame } from '@/context/GameContext';
import styles from './SiteHeader.module.css';

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const {
    connected,
    roomCode,
    gameType,
    variant,
    savedSession,
    pendingRoomAction,
    error: roomError,
    joinRoom,
    joinSavedSession,
  } = useGame();
  const [open, setOpen] = useState(false);
  const [showRoomJoin, setShowRoomJoin] = useState(false);
  const [roomJoinPending, setRoomJoinPending] = useState(false);
  const [roomJoinName, setRoomJoinName] = useState('');
  const [roomJoinCode, setRoomJoinCode] = useState('');
  const [roomJoinError, setRoomJoinError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [guestError, setGuestError] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [role, setRole] = useState<string>('player');

  const user = session?.user as
    | { id?: string; name?: string; image?: string; isGuest?: boolean }
    | undefined;

  const currentGamePath = getGamePath(gameType, variant);
  const savedPath = savedSession?.path || currentGamePath || '/';
  const quickJoinPending = pendingRoomAction?.kind === 'joining';
  const rejoinPending = pendingRoomAction?.kind === 'rejoining';
  const canJoinBack = !!savedSession && !roomCode;
  const canOpenGame = !!roomCode && !!currentGamePath && pathname !== currentGamePath;

  useEffect(() => {
    const savedName = localStorage.getItem('arena_player_name');
    if (savedName) setRoomJoinName(savedName);
  }, []);

  useEffect(() => {
    if (!roomJoinPending || pendingRoomAction || !roomCode || !currentGamePath) return;
    setRoomJoinPending(false);
    setShowRoomJoin(false);
    setRoomJoinCode('');
    router.push(currentGamePath);
  }, [roomJoinPending, pendingRoomAction, roomCode, currentGamePath, router]);

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
    setGuestError('');
    const name = guestName.trim();
    const joinCode = guestCode.trim().toUpperCase();
    if (!name || !joinCode) {
      setGuestError('Name and team code are required.');
      return;
    }
    const result = await signIn('guest', { name, joinCode, redirect: false });
    if (result?.error) {
      setGuestError('That team code was not found.');
      return;
    }
    setShowGuest(false);
    setGuestName('');
    setGuestCode('');
  };

  const handleQuickRoomJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickJoinPending) return;
    const name = roomJoinName.trim() || user?.name?.trim() || '';
    const code = roomJoinCode.trim().toUpperCase();
    if (!name) {
      setRoomJoinError('Enter your name.');
      return;
    }
    if (!code) {
      setRoomJoinError('Enter a room code.');
      return;
    }
    setRoomJoinError('');
    setRoomJoinPending(true);
    joinRoom(code, name);
  };

  const handleJoinBack = () => {
    setRoomJoinPending(true);
    joinSavedSession();
    router.push(savedPath);
  };

  return (
    <header className={styles.header} role="banner">
      <Link href="/" className={styles.brand} aria-label="IcoGenX home">
        <Image src="/icon.svg" alt="IcoGenX Logo - Free 2-Player Online Games" width={36} height={36} className={styles.brandMark} priority />
        <span className={styles.brandWordmark}>
          Ico<span className={styles.brandAccent}>GenX</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        <Link href="/" className={styles.navLink}>Games</Link>
        <Link href="/about" className={styles.navLink}>About</Link>
        <Link href="/tournaments" className={styles.navLink}>Tournaments</Link>
        {user && <Link href="/teams" className={styles.navLink}>Teams</Link>}
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
            <input
              type="text"
              value={guestCode}
              onChange={e => setGuestCode(e.target.value.toUpperCase())}
              placeholder="Team code"
              maxLength={8}
              className={`${styles.guestInput} ${styles.guestCodeInput}`}
              aria-label="Team join code"
            />
            <button type="submit" className={styles.primaryBtn}>Continue</button>
            <button type="button" className={styles.ghostBtn} onClick={() => { setShowGuest(false); setGuestError(''); }}>Cancel</button>
            {guestError && <div className={styles.guestError}>{guestError}</div>}
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

        <div className={styles.roomArea}>
          {canJoinBack && (
            <button
              type="button"
              className={styles.rejoinBtn}
              disabled={!connected || rejoinPending}
              onClick={handleJoinBack}
              title={`Return to room ${savedSession.roomCode}`}
            >
              {rejoinPending ? 'Joining…' : `Join back ${savedSession.roomCode}`}
            </button>
          )}
          {canOpenGame && (
            <button type="button" className={styles.rejoinBtn} onClick={() => router.push(currentGamePath)}>
              Open game
            </button>
          )}
          {showRoomJoin ? (
            <form className={styles.roomJoinForm} onSubmit={handleQuickRoomJoin}>
              <input
                type="text"
                value={roomJoinName}
                onChange={(e) => setRoomJoinName(e.target.value)}
                placeholder="Name"
                maxLength={15}
                className={styles.roomInput}
                aria-label="Player name"
              />
              <input
                type="text"
                value={roomJoinCode}
                onChange={(e) => setRoomJoinCode(e.target.value.toUpperCase())}
                placeholder="Room code"
                maxLength={8}
                className={`${styles.roomInput} ${styles.roomCodeInput}`}
                aria-label="Room code"
                autoFocus
              />
              <button type="submit" className={styles.roomSubmit} disabled={!connected || quickJoinPending}>
                {!connected ? 'Connecting…' : quickJoinPending ? 'Joining…' : 'Join'}
              </button>
              <button type="button" className={styles.roomCancel} onClick={() => { setShowRoomJoin(false); setRoomJoinError(''); }}>
                ×
              </button>
              {(roomJoinError || roomError) && <div className={styles.roomError}>{roomJoinError || roomError}</div>}
            </form>
          ) : (
            <button type="button" className={styles.roomJoinToggle} onClick={() => setShowRoomJoin(true)}>
              Join room
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
