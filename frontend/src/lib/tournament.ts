import type { TournamentMatch, TournamentParticipant } from '@/lib/db';

/** Next power of 2 >= n. */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return Math.max(2, p);
}

const uuid = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `m_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/**
 * Standard single-elimination seeding (1 vs N, 2 vs N-1, …). Pads to next
 * power of 2 with byes (null participant). The caller can later reseed by
 * editing the participant list and rebuilding the bracket.
 */
export function generateKnockoutBracket(participants: TournamentParticipant[]): TournamentMatch[] {
  if (participants.length < 2) return [];
  // Sort by seed ascending (1 is top seed).
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const size = nextPow2(sorted.length);
  // Pad with nulls so seeds line up correctly.
  const slots: Array<TournamentParticipant | null> = sorted.slice();
  while (slots.length < size) slots.push(null);

  // Build first-round pairings: slot i vs slot (size - 1 - i).
  const totalRounds = Math.log2(size);
  const matches: TournamentMatch[] = [];
  const firstRoundPairs = size / 2;
  for (let i = 0; i < firstRoundPairs; i++) {
    const p1 = slots[i];
    const p2 = slots[size - 1 - i];
    const m: TournamentMatch = {
      id: uuid(),
      round: 1,
      slot: i,
      p1Id: p1?.id ?? null,
      p2Id: p2?.id ?? null,
      // Auto-advance byes immediately so brackets render cleanly.
      winnerId: !p1 && p2 ? p2.id : !p2 && p1 ? p1.id : null,
    };
    matches.push(m);
  }
  // Empty placeholder matches for later rounds — winners propagate via
  // {@link advanceWinners} which keys off (round, slot).
  for (let r = 2; r <= totalRounds; r++) {
    const pairs = size / Math.pow(2, r);
    for (let i = 0; i < pairs; i++) {
      matches.push({ id: uuid(), round: r, slot: i, p1Id: null, p2Id: null, winnerId: null });
    }
  }
  // Propagate any byes from round 1.
  return advanceWinners(matches);
}

/**
 * Walk matches round-by-round and copy winners into the next round's slots.
 * Idempotent — safe to call after every {@link updateMatch}.
 */
export function advanceWinners(matches: TournamentMatch[]): TournamentMatch[] {
  const out = matches.map(m => ({ ...m }));
  const byRound = new Map<number, TournamentMatch[]>();
  for (const m of out) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  for (const r of rounds) {
    const nextR = r + 1;
    const next = byRound.get(nextR);
    if (!next) continue;
    const current = byRound.get(r)!.sort((a, b) => a.slot - b.slot);
    for (let i = 0; i < current.length; i += 2) {
      const winA = current[i]?.winnerId ?? null;
      const winB = current[i + 1]?.winnerId ?? null;
      const targetSlot = i / 2;
      const target = next.find(x => x.slot === targetSlot);
      if (!target) continue;
      target.p1Id = winA;
      target.p2Id = winB;
      // Auto-reset later round winner if upstream changed.
      if (target.winnerId && target.winnerId !== winA && target.winnerId !== winB) {
        target.winnerId = null;
        target.scoreP1 = undefined;
        target.scoreP2 = undefined;
      }
    }
  }
  return out;
}
