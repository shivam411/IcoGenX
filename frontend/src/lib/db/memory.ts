import type {
  ActiveMatchRecord,
  AnalyticsSnapshot,
  DbAdapter,
  GameSocialRecord,
  TeamMembership,
  TeamMemberRole,
  TeamRecord,
  TournamentMatch,
  TournamentParticipant,
  TournamentRecord,
  TournamentStatus,
  UserGameInteraction,
  UserRecord,
  UserRole,
} from './types';
import { isVariantMetricId } from '../socialMetrics';
import { generateTeamJoinCode, normalizeTeamJoinCode } from '../teamCodes';

/**
 * In-process storage. Resets on server restart. Fine for dev + LAN play.
 * Not horizontally scalable — flip DB_MODE=mongo for production.
 */
export class MemoryDb implements DbAdapter {
  readonly mode = 'memory' as const;

  private users = new Map<string, UserRecord>();
  private social = new Map<string, GameSocialRecord>();
  private interactions = new Map<string, UserGameInteraction>();

  private teams = new Map<string, TeamRecord>();
  private teamSlugs = new Map<string, string>(); // slug -> id
  private teamJoinCodes = new Map<string, string>(); // joinCode -> id
  private memberships = new Map<string, TeamMembership>(); // `${teamId}:${userId}`
  private activeMatches = new Map<string, ActiveMatchRecord>();

  private tournaments = new Map<string, TournamentRecord>();

  // ---------- helpers
  private socialKey = (gid: string) => gid;
  private intKey = (u: string, g: string) => `${u}:${g}`;
  private memKey = (t: string, u: string) => `${t}:${u}`;
  private uuid = () =>
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  private createUniqueTeamJoinCode(): string {
    for (let i = 0; i < 20; i += 1) {
      const code = generateTeamJoinCode();
      if (!this.teamJoinCodes.has(code)) return code;
    }
    throw new Error('unable to allocate team join code');
  }

  private ensureSocial(gameId: string): GameSocialRecord {
    let rec = this.social.get(gameId);
    if (!rec) {
      rec = { gameId, likes: 0, plays: 0, favorites: 0 };
      this.social.set(gameId, rec);
    }
    return rec;
  }

  private ensureInteraction(userId: string, gameId: string): UserGameInteraction {
    const key = this.intKey(userId, gameId);
    let rec = this.interactions.get(key);
    if (!rec) {
      rec = { userId, gameId, liked: false, favorited: false, plays: 0, updatedAt: Date.now() };
      this.interactions.set(key, rec);
    }
    return rec;
  }

  // ---------- users
  async upsertUser(input: Omit<UserRecord, 'createdAt'> & { createdAt?: number }): Promise<UserRecord> {
    const existing = this.users.get(input.id);
    const rec: UserRecord = {
      id: input.id,
      name: input.name,
      email: input.email,
      image: input.image,
      isGuest: input.isGuest,
      createdAt: existing?.createdAt ?? input.createdAt ?? Date.now(),
      role: existing?.role ?? 'player',
    };
    this.users.set(rec.id, rec);
    return rec;
  }

  async getUser(id: string) { return this.users.get(id) ?? null; }

  async listUsers(limit = 200) {
    return Array.from(this.users.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(u => ({ ...u }));
  }

  async setUserRole(userId: string, role: UserRole) {
    const u = this.users.get(userId);
    if (!u) return null;
    u.role = role;
    return { ...u };
  }

  // ---------- social
  async getGameSocial(gameId: string) { return { ...this.ensureSocial(gameId) }; }
  async getGameSocialMany(gameIds: string[]) {
    const out: Record<string, GameSocialRecord> = {};
    for (const id of gameIds) out[id] = { ...this.ensureSocial(id) };
    return out;
  }
  async getInteraction(userId: string, gameId: string) {
    const r = this.interactions.get(this.intKey(userId, gameId));
    return r ? { ...r } : null;
  }
  async getInteractionsForUser(userId: string) {
    return Array.from(this.interactions.values()).filter(i => i.userId === userId).map(i => ({ ...i }));
  }
  async setLike(userId: string, gameId: string, liked: boolean) {
    const i = this.ensureInteraction(userId, gameId);
    if (i.liked === liked) return { social: { ...this.ensureSocial(gameId) }, interaction: { ...i } };
    const s = this.ensureSocial(gameId);
    s.likes = Math.max(0, s.likes + (liked ? 1 : -1));
    i.liked = liked; i.updatedAt = Date.now();
    return { social: { ...s }, interaction: { ...i } };
  }
  async setFavorite(userId: string, gameId: string, favorited: boolean) {
    const i = this.ensureInteraction(userId, gameId);
    if (i.favorited === favorited) return { social: { ...this.ensureSocial(gameId) }, interaction: { ...i } };
    const s = this.ensureSocial(gameId);
    s.favorites = Math.max(0, s.favorites + (favorited ? 1 : -1));
    i.favorited = favorited; i.updatedAt = Date.now();
    return { social: { ...s }, interaction: { ...i } };
  }
  async incrementPlay(userId: string | null, gameId: string) {
    const s = this.ensureSocial(gameId);
    s.plays += 1;
    if (!userId) return { social: { ...s }, interaction: null };
    const i = this.ensureInteraction(userId, gameId);
    i.plays += 1; i.updatedAt = Date.now();
    return { social: { ...s }, interaction: { ...i } };
  }

  // ---------- teams
  async createTeam(input: { name: string; slug: string; description?: string; ownerId: string }) {
    if (this.teamSlugs.has(input.slug)) {
      throw new Error(`team slug already taken: ${input.slug}`);
    }
    const id = this.uuid();
    const joinCode = this.createUniqueTeamJoinCode();
    const rec: TeamRecord = {
      id, name: input.name, slug: input.slug, description: input.description,
      joinCode, ownerId: input.ownerId, createdAt: Date.now(),
    };
    this.teams.set(id, rec);
    this.teamSlugs.set(input.slug, id);
    this.teamJoinCodes.set(joinCode, id);
    // Owner is the first captain.
    const mem: TeamMembership = { teamId: id, userId: input.ownerId, role: 'captain', joinedAt: Date.now() };
    this.memberships.set(this.memKey(id, input.ownerId), mem);
    return { ...rec };
  }
  async getTeam(id: string) { const t = this.teams.get(id); return t ? { ...t } : null; }
  async getTeamBySlug(slug: string) {
    const id = this.teamSlugs.get(slug);
    return id ? this.getTeam(id) : null;
  }
  async getTeamByJoinCode(joinCode: string) {
    const id = this.teamJoinCodes.get(normalizeTeamJoinCode(joinCode));
    return id ? this.getTeam(id) : null;
  }
  async rotateTeamJoinCode(teamId: string) {
    const team = this.teams.get(teamId);
    if (!team) return null;
    this.teamJoinCodes.delete(team.joinCode);
    team.joinCode = this.createUniqueTeamJoinCode();
    this.teamJoinCodes.set(team.joinCode, teamId);
    return { ...team };
  }
  async listTeams(limit = 200) {
    return Array.from(this.teams.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map(t => ({ ...t }));
  }
  async listTeamsForUser(userId: string) {
    const out: Array<TeamRecord & { role: TeamMemberRole }> = [];
    for (const m of this.memberships.values()) {
      if (m.userId === userId) {
        const t = this.teams.get(m.teamId);
        if (t) out.push({ ...t, role: m.role });
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }
  async addTeamMember(teamId: string, userId: string, role: TeamMemberRole) {
    const key = this.memKey(teamId, userId);
    const existing = this.memberships.get(key);
    if (existing) {
      existing.role = role;
      return { ...existing };
    }
    const mem: TeamMembership = { teamId, userId, role, joinedAt: Date.now() };
    this.memberships.set(key, mem);
    return { ...mem };
  }
  async removeTeamMember(teamId: string, userId: string) {
    this.memberships.delete(this.memKey(teamId, userId));
  }
  async setTeamMemberRole(teamId: string, userId: string, role: TeamMemberRole) {
    const m = this.memberships.get(this.memKey(teamId, userId));
    if (!m) return null;
    m.role = role;
    return { ...m };
  }
  async listTeamMembers(teamId: string) {
    const out: Array<TeamMembership & { user: UserRecord | null }> = [];
    for (const m of this.memberships.values()) {
      if (m.teamId !== teamId) continue;
      const u = this.users.get(m.userId) ?? null;
      out.push({ ...m, user: u ? { ...u } : null });
    }
    return out.sort((a, b) => a.joinedAt - b.joinedAt);
  }
  async getTeamMembership(teamId: string, userId: string) {
    const m = this.memberships.get(this.memKey(teamId, userId));
    return m ? { ...m } : null;
  }

  // ---------- active matches
  async announceMatch(input: Omit<ActiveMatchRecord, 'id' | 'createdAt'>) {
    const id = this.uuid();
    const rec: ActiveMatchRecord = { ...input, id, createdAt: Date.now() };
    this.activeMatches.set(id, rec);
    return { ...rec };
  }
  async endMatch(matchId: string) {
    const m = this.activeMatches.get(matchId);
    if (m) m.endedAt = Date.now();
  }
  async listActiveMatches(teamId: string) {
    return Array.from(this.activeMatches.values())
      .filter(m => m.teamId === teamId && !m.endedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(m => ({ ...m }));
  }
  async listAllActiveMatches(limit = 100) {
    return Array.from(this.activeMatches.values())
      .filter(m => !m.endedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(m => ({ ...m }));
  }

  // ---------- tournaments
  async createTournament(input: Omit<TournamentRecord, 'id' | 'createdAt' | 'participants' | 'matches' | 'status'> & { status?: TournamentStatus }) {
    const id = this.uuid();
    const rec: TournamentRecord = {
      id,
      name: input.name,
      gameId: input.gameId,
      format: input.format,
      status: input.status ?? 'draft',
      organizerId: input.organizerId,
      teamId: input.teamId,
      createdAt: Date.now(),
      participants: [],
      matches: [],
      bracketSize: input.bracketSize,
    };
    this.tournaments.set(id, rec);
    return { ...rec, participants: [], matches: [] };
  }
  async getTournament(id: string) {
    const t = this.tournaments.get(id);
    return t ? structuredClone(t) : null;
  }
  async listTournaments(opts?: { organizerId?: string; teamId?: string; limit?: number }) {
    const limit = opts?.limit ?? 200;
    return Array.from(this.tournaments.values())
      .filter(t => (!opts?.organizerId || t.organizerId === opts.organizerId) && (!opts?.teamId || t.teamId === opts.teamId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(t => structuredClone(t));
  }
  async updateTournament(id: string, patch: Partial<Pick<TournamentRecord, 'name' | 'status' | 'gameId'>>) {
    const t = this.tournaments.get(id);
    if (!t) return null;
    if (patch.name !== undefined) t.name = patch.name;
    if (patch.status !== undefined) t.status = patch.status;
    if (patch.gameId !== undefined) t.gameId = patch.gameId;
    return structuredClone(t);
  }
  async setParticipants(id: string, participants: TournamentParticipant[]) {
    const t = this.tournaments.get(id);
    if (!t) return null;
    t.participants = participants.map(p => ({ ...p }));
    return structuredClone(t);
  }
  async setMatches(id: string, matches: TournamentMatch[]) {
    const t = this.tournaments.get(id);
    if (!t) return null;
    t.matches = matches.map(m => ({ ...m }));
    return structuredClone(t);
  }
  async updateMatch(tournamentId: string, matchId: string, patch: Partial<TournamentMatch>) {
    const t = this.tournaments.get(tournamentId);
    if (!t) return null;
    const m = t.matches.find(x => x.id === matchId);
    if (!m) return structuredClone(t);
    Object.assign(m, patch);
    return structuredClone(t);
  }
  async deleteTournament(id: string) { this.tournaments.delete(id); }

  // ---------- analytics
  async getAnalytics(): Promise<AnalyticsSnapshot> {
    let totalPlays = 0, totalLikes = 0, totalFavorites = 0;
    const games: Array<{ gameId: string; plays: number; likes: number; favorites: number }> = [];
    for (const s of this.social.values()) {
      if (isVariantMetricId(s.gameId)) continue;
      totalPlays += s.plays; totalLikes += s.likes; totalFavorites += s.favorites;
      games.push({ gameId: s.gameId, plays: s.plays, likes: s.likes, favorites: s.favorites });
    }
    games.sort((a, b) => b.plays - a.plays);
    let totalGuests = 0;
    for (const u of this.users.values()) if (u.isGuest) totalGuests++;
    return {
      totalUsers: this.users.size,
      totalGuests,
      totalTeams: this.teams.size,
      totalTournaments: this.tournaments.size,
      totalActiveMatches: Array.from(this.activeMatches.values()).filter(m => !m.endedAt).length,
      totalPlays, totalLikes, totalFavorites,
      topGames: games.slice(0, 10),
    };
  }
}
