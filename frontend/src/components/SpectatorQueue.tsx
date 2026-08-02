'use client';

import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import styles from './SpectatorQueue.module.css';

export default function SpectatorQueue() {
  const {
    spectators,
    playerNumber,
    playerCount,
    allPlayerNames,
    swapPlayer,
  } = useGame();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Creator is always playerNumber 0
  const isHost = playerNumber === 0;

  if (spectators.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>👁️ Spectators</h3>
        <div className={styles.emptyState}>
          No viewers in lobby
        </div>
      </div>
    );
  }

  const activeOpponents = Array.from({ length: playerCount - 1 }, (_, i) => i + 1); // seats 1..N-1

  const handleSwapClick = (spectatorId: string) => {
    if (playerCount <= 2) {
      // Direct swap for 2-player games
      swapPlayer(1, spectatorId);
    } else {
      // Toggle dropdown for multi-player games
      setActiveMenuId(activeMenuId === spectatorId ? null : spectatorId);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'V';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>👁️ Spectators ({spectators.length})</h3>
      <div className={styles.list}>
        {spectators.map((spec) => (
          <div key={spec.player_id} className={styles.item}>
            <div className={styles.avatar} style={{
              background: `linear-gradient(135deg, hsl(${(spec.player_name.charCodeAt(0) * 10) % 360}, 65%, 45%) 0%, hsl(${(spec.player_name.charCodeAt(0) * 10 + 40) % 360}, 65%, 35%) 100%)`
            }}>
              {getInitials(spec.player_name)}
            </div>
            
            <div className={styles.details}>
              <span className={styles.name}>{spec.player_name}</span>
              <span className={styles.role}>Viewer</span>
            </div>

            {isHost && (
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => handleSwapClick(spec.player_id)}
                  className={`btn btn-sm btn-outline ${styles.swapBtn}`}
                >
                  Swap 🔄
                </button>

                {activeMenuId === spec.player_id && playerCount > 2 && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>Select seat to replace:</div>
                    {activeOpponents.map((seatIndex) => (
                      <button
                        key={seatIndex}
                        type="button"
                        onClick={() => {
                          swapPlayer(seatIndex, spec.player_id);
                          setActiveMenuId(null);
                        }}
                        className={styles.dropdownItem}
                      >
                        Seat {seatIndex + 1}: {allPlayerNames[seatIndex] || `Player ${seatIndex + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
