'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGame } from '@/context/GameContext';
import styles from './SocialDock.module.css';

export default function SocialDock() {
  const { data: session } = useSession();
  const {
    roomCode,
    gameType,
    variant,
    friends,
    sendGameInvite,
    addFriend,
    respondToFriendRequest,
  } = useGame();

  const [isOpen, setIsOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);

  const user = session?.user as { id?: string; name?: string; image?: string; isGuest?: boolean; friendCode?: string } | undefined;

  // Don't show social dock for guests or logged-out users
  if (!user || user.isGuest) return null;

  const myFriendCode = user.friendCode || '';

  const pendingRequests = friends.filter(
    (f) => f.status === 'pending' && !f.isInitiator
  );

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const sortedFriends = [...acceptedFriends].sort((a, b) => {
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    return a.friend.name.localeCompare(b.friend.name);
  });

  const handleCopyCode = async () => {
    if (!myFriendCode) return;
    try {
      await navigator.clipboard.writeText(myFriendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = friendCodeInput.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setAddStatus({ type: 'error', message: 'Friend code must be 6 characters.' });
      return;
    }

    setIsSubmitting(true);
    setAddStatus(null);
    try {
      await addFriend(code);
      setAddStatus({ type: 'success', message: 'Friend request sent!' });
      setFriendCodeInput('');
    } catch (err: any) {
      setAddStatus({ type: 'error', message: err.message || 'Failed to send request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteClick = (friendId: string) => {
    if (roomCode && gameType) {
      // If host is already in a room, send invite directly for this room
      sendGameInvite(friendId, gameType, variant);
      alert('Invitation sent for the current lobby!');
    } else {
      // Toggle game selector for this friend
      setInvitingFriendId(invitingFriendId === friendId ? null : friendId);
    }
  };

  const handleSelectGameToInvite = (friendId: string, inviteGameType: string, inviteVariant: string | null = null) => {
    sendGameInvite(friendId, inviteGameType, inviteVariant);
    setInvitingFriendId(null);
    alert('Invitation sent! Setting up room...');
  };

  const inviteGames = [
    {
      id: 'tic_tac_toe',
      name: 'Tic-Tac-Toe',
      variants: [
        { id: null, name: 'Classic' },
        { id: 'blind', name: 'Blind' },
        { id: 'disappearing', name: 'Disappearing' },
        { id: 'bidding', name: 'Bidding' },
        { id: 'gravity', name: 'Gravity' },
      ],
    },
    { id: 'bluff_card', name: 'Bluff Card' },
    { id: 'memory_flip', name: 'Sequence Memory Flip' },
    {
      id: 'higher_lower',
      name: 'Higher / Lower',
      variants: [
        { id: null, name: 'Classic' },
        { id: 'code_breaker_number', name: 'Code Breaker (Num)' },
      ],
    },
    { id: 'stop_clock', name: 'Stop-Clock' },
    { id: 'shut_the_box', name: 'Dice Tug-of-War' },
    { id: 'code_guess', name: 'Code Breaker' },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setIsOpen(true)}
        aria-label="Open Social Panel"
      >
        <span className={styles.fabIcon}>👥</span>
        {pendingRequests.length > 0 && (
          <span className={styles.badge}>{pendingRequests.length}</span>
        )}
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Panel */}
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Social &amp; Friends</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsOpen(false)}
            aria-label="Close Social Panel"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {/* Section 1: User's friend code */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Your Account Code</h4>
            <div className={styles.codeRow}>
              <span className={styles.codeText}>{myFriendCode}</span>
              <button
                type="button"
                className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
                onClick={handleCopyCode}
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
            <p className={styles.sectionHint}>
              Share this code with friends so they can add you directly.
            </p>
          </div>

          {/* Section 2: Add friend by code */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Add Friend</h4>
            <form onSubmit={handleAddFriend} className={styles.addForm}>
              <input
                type="text"
                placeholder="Enter 6-char code"
                maxLength={6}
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                className={styles.addInput}
                disabled={isSubmitting}
                aria-label="Friend Code"
              />
              <button
                type="submit"
                className={styles.addSubmit}
                disabled={isSubmitting || friendCodeInput.trim().length !== 6}
              >
                {isSubmitting ? '...' : 'Add'}
              </button>
            </form>
            {addStatus && (
              <div
                className={`${styles.statusMessage} ${
                  addStatus.type === 'success' ? styles.statusSuccess : styles.statusError
                }`}
              >
                {addStatus.message}
              </div>
            )}
          </div>

          {/* Section 3: Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                Friend Requests ({pendingRequests.length})
              </h4>
              <div className={styles.requestList}>
                {pendingRequests.map((req) => (
                  <div key={req.friendshipId} className={styles.requestItem}>
                    <span className={styles.requestName}>{req.friend.name}</span>
                    <div className={styles.requestActions}>
                      <button
                        type="button"
                        className={styles.acceptBtn}
                        onClick={() => respondToFriendRequest(req.friendshipId, 'accept')}
                        aria-label={`Accept request from ${req.friend.name}`}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className={styles.declineBtn}
                        onClick={() => respondToFriendRequest(req.friendshipId, 'decline')}
                        aria-label={`Decline request from ${req.friend.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Friends List */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Friends</h4>
            {sortedFriends.length === 0 ? (
              <div className={styles.emptyFriends}>
                No friends added yet. Enter a code above to start connecting!
              </div>
            ) : (
              <div className={styles.friendList}>
                {sortedFriends.map((f) => {
                  const isOnline = f.online;
                  const inLobby = f.currentRoom;
                  const isInviting = invitingFriendId === f.friend.id;

                  return (
                    <div key={f.friendshipId} className={styles.friendItemWrapper}>
                      <div className={styles.friendItem}>
                        <div className={styles.friendDetails}>
                          <span
                            className={`${styles.statusDot} ${
                              isOnline ? styles.statusOnline : styles.statusOffline
                            }`}
                            title={isOnline ? 'Online' : 'Offline'}
                          />
                          <span className={styles.friendName}>{f.friend.name}</span>
                          {isOnline && inLobby && (
                            <span className={styles.inLobbyTag}>In Lobby</span>
                          )}
                        </div>
                        {isOnline && (
                          <button
                            type="button"
                            className={styles.inviteBtn}
                            onClick={() => handleInviteClick(f.friend.id)}
                          >
                            {roomCode ? '⚔️ Join' : '⚔️ Invite'}
                          </button>
                        )}
                      </div>

                      {/* Expanded Game Selector Sub-Menu */}
                      {isOnline && isInviting && (
                        <div className={styles.gameSelector}>
                          <p className={styles.selectorTitle}>Select a game to invite:</p>
                          <div className={styles.selectorGrid}>
                            {inviteGames.map((game) => (
                              <div key={game.id} className={styles.gameOptionGroup}>
                                {game.variants ? (
                                  <>
                                    <div className={styles.gameOptionLabel}>{game.name}</div>
                                    <div className={styles.variantRow}>
                                      {game.variants.map((v) => (
                                        <button
                                          key={v.id ?? 'classic'}
                                          type="button"
                                          className={styles.variantOptionBtn}
                                          onClick={() =>
                                            handleSelectGameToInvite(f.friend.id, game.id, v.id)
                                          }
                                        >
                                          {v.name}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.gameOptionBtn}
                                    onClick={() => handleSelectGameToInvite(f.friend.id, game.id)}
                                  >
                                    {game.name}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
