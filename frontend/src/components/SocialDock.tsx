'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useGame } from '@/context/GameContext';
import { GAME_CATALOG, type GameCatalogItem, type GameVariantMetadata } from '@/lib/gameMetadata';
import GameIcon from './GameIcon';
import styles from './SocialDock.module.css';

function inviteTarget(game: GameCatalogItem, selectedVariant?: GameVariantMetadata | null) {
  if (game.gameType === 'code_guess' && selectedVariant?.id === 'number-range') {
    return { gameType: 'higher_lower', variant: 'code_breaker_number' };
  }
  if (game.gameType === 'code_guess' && selectedVariant?.id === 'digits') {
    return { gameType: 'code_guess', variant: null };
  }
  return {
    gameType: game.gameType,
    variant: selectedVariant ? selectedVariant.id : null,
  };
}

export default function SocialDock() {
  const { data: session } = useSession();
  const {
    roomCode,
    gameType,
    variant,
    connected,
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
  const outgoingRequests = friends.filter(
    (f) => f.status === 'pending' && f.isInitiator
  );

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const sortedFriends = [...acceptedFriends].sort((a, b) => {
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    return a.friend.name.localeCompare(b.friend.name);
  });
  const onlineFriends = sortedFriends.filter((f) => f.online);
  const offlineFriends = sortedFriends.filter((f) => !f.online);

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

  const handleInviteClick = async (friendId: string) => {
    if (roomCode && gameType) {
      try {
        await sendGameInvite(friendId, gameType, variant);
        setAddStatus({ type: 'success', message: 'Invitation sent for the current lobby.' });
      } catch (err: any) {
        setAddStatus({ type: 'error', message: err.message || 'Failed to send invite.' });
      }
    } else {
      // Toggle game selector for this friend
      setInvitingFriendId(invitingFriendId === friendId ? null : friendId);
    }
  };

  const handleSelectGameToInvite = async (friendId: string, game: GameCatalogItem, selectedVariant?: GameVariantMetadata | null) => {
    const target = inviteTarget(game, selectedVariant);
    try {
      await sendGameInvite(friendId, target.gameType, target.variant);
      setInvitingFriendId(null);
      setAddStatus({ type: 'success', message: 'Invitation sent.' });
    } catch (err: any) {
      setAddStatus({ type: 'error', message: err.message || 'Failed to send invite.' });
    }
  };

  const inviteGames = GAME_CATALOG.filter((game) => !game.isComingSoon);

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

          {outgoingRequests.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Waiting For Response ({outgoingRequests.length})</h4>
              <div className={styles.requestList}>
                {outgoingRequests.map((req) => (
                  <div key={req.friendshipId} className={styles.requestItem}>
                    <span className={styles.requestName}>{req.friend.name}</span>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => respondToFriendRequest(req.friendshipId, 'cancel')}
                    >
                      Cancel
                    </button>
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
                {[...onlineFriends, ...offlineFriends].map((f, index) => {
                  const isOnline = f.online;
                  const inLobby = f.currentRoom;
                  const isInviting = invitingFriendId === f.friend.id;
                  const showGroupTitle =
                    index === 0 ||
                    (index === onlineFriends.length && offlineFriends.length > 0);

                  return (
                    <div key={f.friendshipId} className={styles.friendItemWrapper}>
                      {showGroupTitle && (
                        <div className={styles.friendGroupTitle}>{isOnline ? 'Online' : 'Offline'}</div>
                      )}
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
                            disabled={!connected}
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
                                    <div className={styles.gameOptionLabel}>
                                      <GameIcon icon={game.icon} className={styles.variantOptionIcon} />
                                      <span>{game.name}</span>
                                    </div>
                                    <div className={styles.variantRow}>
                                      {game.variants.map((v) => (
                                        <button
                                          key={v.id}
                                          type="button"
                                          className={styles.variantOptionBtn}
                                          onClick={() =>
                                            handleSelectGameToInvite(f.friend.id, game, v)
                                          }
                                        >
                                          <GameIcon icon={v.icon} className={styles.variantOptionIcon} />
                                          {v.name}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className={styles.gameOptionBtn}
                                    onClick={() => handleSelectGameToInvite(f.friend.id, game, null)}
                                  >
                                    <GameIcon icon={game.icon} className={styles.variantOptionIcon} />
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
