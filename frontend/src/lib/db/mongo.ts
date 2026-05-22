import { MongoClient, MongoServerError, type Db, type Collection } from 'mongodb';
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

type UserDoc = UserRecord;
type SocialDoc = GameSocialRecord & { _id?: string };
type InteractionDoc = UserGameInteraction & { _id: string };
type TeamDoc = TeamRecord & { _id?: string };
type MembershipDoc = TeamMembership & { _id: string };
type ActiveMatchDoc = ActiveMatchRecord & { _id?: string };
type TournamentDoc = TournamentRecord & { _id?: string };

/**
 * MongoDB-backed adapter. Lazy: connects on first request.
 *
 * Collections:
 *   users           — UserRecord (by id)
 *   game_social     — GameSocialRecord (by gameId)
 *   user_game       — UserGameInteraction (_id = `${userId}:${gameId}`)
 *   teams           — TeamRecord (by id, unique slug)
 *   team_members    — TeamMembership (_id = `${teamId}:${userId}`)
 *   active_matches  — ActiveMatchRecord (by id)
 *   tournaments     — TournamentRecord (by id)
 */
export class MongoDb implements DbAdapter {
  readonly mode = 'mongo' as const;
  private clientPromise: Promise<MongoClient> | null = null;
  private indexesEnsured = false;

  constructor(private readonly uri: string, private readonly dbName: string) {}

  private async db(): Promise<Db> {
    if (!this.clientPromise) {
      const client = new MongoClient(this.uri, { maxPoolSize: 10 });
      this.clientPromise = client.connect();
    }
    const db = (await this.clientPromise).db(this.dbName);
    if (!this.indexesEnsured) {
      this.indexesEnsured = true;
      try {
        await Promise.all([
          db.collection('users').createIndex({ id: 1 }, { unique: true }),
          db.collection('game_social').createIndex({ gameId: 1 }, { unique: true }),
          db.collection('user_game').createIndex({ userId: 1, gameId: 1 }, { unique: true }),
          db.collection('teams').createIndex({ id: 1 }, { unique: true }),
          db.collection('teams').createIndex({ slug: 1 }, { unique: true }),
          db.collection('teams').createIndex({ joinCode: 1 }, { unique: true, sparse: true }),
          db.collection('team_members').createIndex({ teamId: 1, userId: 1 }, { unique: true }),
          db.collection('team_members').createIndex({ userId: 1 }),
          db.collection('active_matches').createIndex({ teamId: 1, endedAt: 1 }),
          db.collection('tournaments').createIndex({ id: 1 }, { unique: true }),
          db.collection('tournaments').createIndex({ organizerId: 1 }),
        ]);
      } catch (err) {
        console.warn('[mongo] index creation warning', err);
      }
    }
    return db;
  }

  private async users(): Promise<Collection<UserDoc>> { return (await this.db()).collection<UserDoc>('users'); }
  private async social(): Promise<Collection<SocialDoc>> { return (await this.db()).collection<SocialDoc>('game_social'); }
  private async interactions(): Promise<Collection<InteractionDoc>> { return (await this.db()).collection<InteractionDoc>('user_game'); }
  private async teamsCol(): Promise<Collection<TeamDoc>> { return (await this.db()).collection<TeamDoc>('teams'); }
  private async members(): Promise<Collection<MembershipDoc>> { return (await this.db()).collection<MembershipDoc>('team_members'); }
  private async activeMatches(): Promise<Collection<ActiveMatchDoc>> { return (await this.db()).collection<ActiveMatchDoc>('active_matches'); }
  private async tournaments(): Promise<Collection<TournamentDoc>> { return (await this.db()).collection<TournamentDoc>('tournaments'); }

  private intKey = (u: string, g: string) => `${u}:${g}`;
  private memKey = (t: string, u: string) => `${t}:${u}`;
  private uuid = () =>
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  private isJoinCodeConflict(error: unknown): boolean {
    if (!(error instanceof MongoServerError) || error.code !== 11000) return false;
    const keyPattern = error.keyPattern as Record<string, number> | undefined;
    return keyPattern?.joinCode === 1 || error.message.includes('joinCode');
  }

  private teamDocToRecord(doc: TeamDoc): TeamRecord {
    const { _id, ...team } = doc;
    void _id;
    return team;
  }

  private async uniqueTeamJoinCode(): Promise<string> {
    const teams = await this.teamsCol();
    for (let i = 0; i < 20; i += 1) {
      const code = generateTeamJoinCode();
      const existing = await teams.findOne({ joinCode: code });
      if (!existing) return code;
    }
    throw new Error('unable to allocate team join code');
  }

  private async ensureTeamJoinCode(doc: TeamDoc | null): Promise<TeamRecord | null> {
    if (!doc) return null;
    const team = this.teamDocToRecord(doc);
    if (team.joinCode) return team;
    const teams = await this.teamsCol();
    for (let i = 0; i < 20; i += 1) {
      const current = await teams.findOne({ id: team.id });
      if (!current) return null;
      const currentTeam = this.teamDocToRecord(current);
      if (currentTeam.joinCode) return currentTeam;

      const joinCode = await this.uniqueTeamJoinCode();
      try {
        const result = await teams.updateOne(
          { id: team.id, joinCode: { $exists: false } },
          { $set: { joinCode } },
        );
        if (result.modifiedCount === 1) return { ...currentTeam, joinCode };
      } catch (error) {
        if (!this.isJoinCodeConflict(error)) throw error;
      }
    }

    const current = await teams.findOne({ id: team.id });
    if (current?.joinCode) return this.teamDocToRecord(current);
    throw new Error('unable to allocate team join code');
  }

  // ---------- users
  async upsertUser(input: Omit<UserRecord, 'createdAt'> & { createdAt?: number }) {
    const users = await this.users();
    const now = Date.now();
    await users.updateOne(
      { id: input.id },
      {
        $set: { id: input.id, name: input.name, email: input.email, image: input.image, isGuest: input.isGuest },
        $setOnInsert: { createdAt: input.createdAt ?? now, role: 'player' as UserRole },
      },
      { upsert: true },
    );
    const doc = await users.findOne({ id: input.id });
    return doc!;
  }
  async getUser(id: string) { return (await this.users()).findOne({ id }); }
  async listUsers(limit = 200) {
    return (await this.users()).find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  }
  async setUserRole(userId: string, role: UserRole) {
    await (await this.users()).updateOne({ id: userId }, { $set: { role } });
    return this.getUser(userId);
  }

  // ---------- social
  async getGameSocial(gameId: string) {
    const doc = await (await this.social()).findOne({ gameId });
    if (!doc) return { gameId, likes: 0, plays: 0, favorites: 0 };
    return { gameId: doc.gameId, likes: doc.likes ?? 0, plays: doc.plays ?? 0, favorites: doc.favorites ?? 0 };
  }
  async getGameSocialMany(gameIds: string[]) {
    const cursor = (await this.social()).find({ gameId: { $in: gameIds } });
    const out: Record<string, GameSocialRecord> = {};
    for (const id of gameIds) out[id] = { gameId: id, likes: 0, plays: 0, favorites: 0 };
    for await (const doc of cursor) {
      out[doc.gameId] = { gameId: doc.gameId, likes: doc.likes ?? 0, plays: doc.plays ?? 0, favorites: doc.favorites ?? 0 };
    }
    return out;
  }
  async getInteraction(userId: string, gameId: string) {
    const doc = await (await this.interactions()).findOne({ userId, gameId });
    if (!doc) return null;
    return { userId: doc.userId, gameId: doc.gameId, liked: !!doc.liked, favorited: !!doc.favorited, plays: doc.plays ?? 0, updatedAt: doc.updatedAt ?? 0 };
  }
  async getInteractionsForUser(userId: string) {
    const docs = await (await this.interactions()).find({ userId }).toArray();
    return docs.map(d => ({ userId: d.userId, gameId: d.gameId, liked: !!d.liked, favorited: !!d.favorited, plays: d.plays ?? 0, updatedAt: d.updatedAt ?? 0 }));
  }
  async setLike(userId: string, gameId: string, liked: boolean) {
    const existing = await this.getInteraction(userId, gameId);
    if (existing?.liked === liked) return { social: await this.getGameSocial(gameId), interaction: existing };
    const delta = liked ? 1 : -1;
    await (await this.interactions()).updateOne(
      { _id: this.intKey(userId, gameId) },
      { $set: { userId, gameId, liked, updatedAt: Date.now() }, $setOnInsert: { favorited: false, plays: 0 } },
      { upsert: true },
    );
    await (await this.social()).updateOne(
      { gameId }, { $inc: { likes: delta }, $setOnInsert: { plays: 0, favorites: 0 } }, { upsert: true },
    );
    return { social: await this.getGameSocial(gameId), interaction: (await this.getInteraction(userId, gameId))! };
  }
  async setFavorite(userId: string, gameId: string, favorited: boolean) {
    const existing = await this.getInteraction(userId, gameId);
    if (existing?.favorited === favorited) return { social: await this.getGameSocial(gameId), interaction: existing };
    const delta = favorited ? 1 : -1;
    await (await this.interactions()).updateOne(
      { _id: this.intKey(userId, gameId) },
      { $set: { userId, gameId, favorited, updatedAt: Date.now() }, $setOnInsert: { liked: false, plays: 0 } },
      { upsert: true },
    );
    await (await this.social()).updateOne(
      { gameId }, { $inc: { favorites: delta }, $setOnInsert: { plays: 0, likes: 0 } }, { upsert: true },
    );
    return { social: await this.getGameSocial(gameId), interaction: (await this.getInteraction(userId, gameId))! };
  }
  async incrementPlay(userId: string | null, gameId: string) {
    await (await this.social()).updateOne(
      { gameId }, { $inc: { plays: 1 }, $setOnInsert: { likes: 0, favorites: 0 } }, { upsert: true },
    );
    const social = await this.getGameSocial(gameId);
    if (!userId) return { social, interaction: null };
    await (await this.interactions()).updateOne(
      { _id: this.intKey(userId, gameId) },
      { $set: { userId, gameId, updatedAt: Date.now() }, $inc: { plays: 1 }, $setOnInsert: { liked: false, favorited: false } },
      { upsert: true },
    );
    return { social, interaction: (await this.getInteraction(userId, gameId))! };
  }

  // ---------- teams
  async createTeam(input: { name: string; slug: string; description?: string; ownerId: string }) {
    const id = this.uuid();
    const teams = await this.teamsCol();
    let rec: TeamRecord | null = null;
    for (let i = 0; i < 20; i += 1) {
      const joinCode = await this.uniqueTeamJoinCode();
      const candidate: TeamRecord = {
        id, name: input.name, slug: input.slug, description: input.description,
        joinCode, ownerId: input.ownerId, createdAt: Date.now(),
      };
      try {
        await teams.insertOne(candidate);
        rec = candidate;
        break;
      } catch (error) {
        if (!this.isJoinCodeConflict(error)) throw error;
      }
    }
    if (!rec) throw new Error('unable to allocate team join code');
    const mem: TeamMembership = { teamId: id, userId: input.ownerId, role: 'captain', joinedAt: Date.now() };
    await (await this.members()).updateOne(
      { _id: this.memKey(id, input.ownerId) },
      { $set: mem }, { upsert: true },
    );
    return rec;
  }
  async getTeam(id: string) { return this.ensureTeamJoinCode(await (await this.teamsCol()).findOne({ id })); }
  async getTeamBySlug(slug: string) { return this.ensureTeamJoinCode(await (await this.teamsCol()).findOne({ slug })); }
  async getTeamByJoinCode(joinCode: string) {
    return this.ensureTeamJoinCode(await (await this.teamsCol()).findOne({ joinCode: normalizeTeamJoinCode(joinCode) }));
  }
  async rotateTeamJoinCode(teamId: string) {
    const teams = await this.teamsCol();
    for (let i = 0; i < 20; i += 1) {
      const joinCode = await this.uniqueTeamJoinCode();
      try {
        const result = await teams.updateOne({ id: teamId }, { $set: { joinCode } });
        if (result.matchedCount === 0) return null;
        return this.getTeam(teamId);
      } catch (error) {
        if (!this.isJoinCodeConflict(error)) throw error;
      }
    }
    throw new Error('unable to allocate team join code');
  }
  async listTeams(limit = 200) {
    const docs = await (await this.teamsCol()).find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    return (await Promise.all(docs.map((doc) => this.ensureTeamJoinCode(doc)))).filter((team): team is TeamRecord => !!team);
  }
  async listTeamsForUser(userId: string) {
    const memberships = await (await this.members()).find({ userId }).toArray();
    const teamIds = memberships.map(m => m.teamId);
    if (teamIds.length === 0) return [];
    const teams = await (await this.teamsCol()).find({ id: { $in: teamIds } }).toArray();
    const byId = new Map(teams.map(t => [t.id, t] as const));
    const out: Array<TeamRecord & { role: TeamMemberRole }> = [];
    for (const m of memberships) {
      const t = byId.get(m.teamId);
      if (!t) continue;
      const rest = await this.ensureTeamJoinCode(t);
      if (rest) out.push({ ...rest, role: m.role });
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }
  async addTeamMember(teamId: string, userId: string, role: TeamMemberRole) {
    const mem: TeamMembership = { teamId, userId, role, joinedAt: Date.now() };
    await (await this.members()).updateOne(
      { _id: this.memKey(teamId, userId) },
      { $set: { teamId, userId, role }, $setOnInsert: { joinedAt: mem.joinedAt } },
      { upsert: true },
    );
    return mem;
  }
  async removeTeamMember(teamId: string, userId: string) {
    await (await this.members()).deleteOne({ _id: this.memKey(teamId, userId) });
  }
  async setTeamMemberRole(teamId: string, userId: string, role: TeamMemberRole) {
    const r = await (await this.members()).findOneAndUpdate(
      { _id: this.memKey(teamId, userId) },
      { $set: { role } },
      { returnDocument: 'after' },
    );
    return r ?? null;
  }
  async listTeamMembers(teamId: string) {
    const memberships = await (await this.members()).find({ teamId }).sort({ joinedAt: 1 }).toArray();
    const userIds = memberships.map(m => m.userId);
    const users = userIds.length ? await (await this.users()).find({ id: { $in: userIds } }).toArray() : [];
    const byId = new Map(users.map(u => [u.id, u] as const));
    return memberships.map(m => ({ ...m, user: byId.get(m.userId) ?? null }));
  }
  async getTeamMembership(teamId: string, userId: string) {
    return (await this.members()).findOne({ _id: this.memKey(teamId, userId) });
  }

  // ---------- active matches
  async announceMatch(input: Omit<ActiveMatchRecord, 'id' | 'createdAt'>) {
    const id = this.uuid();
    const rec: ActiveMatchRecord = { ...input, id, createdAt: Date.now() };
    await (await this.activeMatches()).insertOne(rec);
    return rec;
  }
  async endMatch(matchId: string) {
    await (await this.activeMatches()).updateOne({ id: matchId }, { $set: { endedAt: Date.now() } });
  }
  async listActiveMatches(teamId: string) {
    return (await this.activeMatches()).find({ teamId, endedAt: { $exists: false } as never }).sort({ createdAt: -1 }).toArray();
  }
  async listAllActiveMatches(limit = 100) {
    return (await this.activeMatches()).find({ endedAt: { $exists: false } as never }).sort({ createdAt: -1 }).limit(limit).toArray();
  }

  // ---------- tournaments
  async createTournament(input: Omit<TournamentRecord, 'id' | 'createdAt' | 'participants' | 'matches' | 'status'> & { status?: TournamentStatus }) {
    const id = this.uuid();
    const rec: TournamentRecord = {
      id, name: input.name, gameId: input.gameId, format: input.format,
      status: input.status ?? 'draft', organizerId: input.organizerId, teamId: input.teamId,
      createdAt: Date.now(), participants: [], matches: [], bracketSize: input.bracketSize,
    };
    await (await this.tournaments()).insertOne(rec);
    return rec;
  }
  async getTournament(id: string) { return (await this.tournaments()).findOne({ id }); }
  async listTournaments(opts?: { organizerId?: string; teamId?: string; limit?: number }) {
    const q: Record<string, unknown> = {};
    if (opts?.organizerId) q.organizerId = opts.organizerId;
    if (opts?.teamId) q.teamId = opts.teamId;
    return (await this.tournaments()).find(q).sort({ createdAt: -1 }).limit(opts?.limit ?? 200).toArray();
  }
  async updateTournament(id: string, patch: Partial<Pick<TournamentRecord, 'name' | 'status' | 'gameId'>>) {
    await (await this.tournaments()).updateOne({ id }, { $set: patch });
    return this.getTournament(id);
  }
  async setParticipants(id: string, participants: TournamentParticipant[]) {
    await (await this.tournaments()).updateOne({ id }, { $set: { participants } });
    return this.getTournament(id);
  }
  async setMatches(id: string, matches: TournamentMatch[]) {
    await (await this.tournaments()).updateOne({ id }, { $set: { matches } });
    return this.getTournament(id);
  }
  async updateMatch(tournamentId: string, matchId: string, patch: Partial<TournamentMatch>) {
    const t = await this.getTournament(tournamentId);
    if (!t) return null;
    const m = t.matches.find(x => x.id === matchId);
    if (!m) return t;
    Object.assign(m, patch);
    return this.setMatches(tournamentId, t.matches);
  }
  async deleteTournament(id: string) {
    await (await this.tournaments()).deleteOne({ id });
  }

  // ---------- analytics
  async getAnalytics(): Promise<AnalyticsSnapshot> {
    const [usersC, socialC, teamsC, tournC, amC] = await Promise.all([
      this.users(), this.social(), this.teamsCol(), this.tournaments(), this.activeMatches(),
    ]);
    const [totalUsers, totalGuests, totalTeams, totalTournaments, totalActiveMatches, socialDocs] = await Promise.all([
      usersC.countDocuments({}),
      usersC.countDocuments({ isGuest: true }),
      teamsC.countDocuments({}),
      tournC.countDocuments({}),
      amC.countDocuments({ endedAt: { $exists: false } as never }),
      socialC.find({}).toArray(),
    ]);
    let totalPlays = 0, totalLikes = 0, totalFavorites = 0;
    const topGames = socialDocs
      .filter((s) => !isVariantMetricId(s.gameId))
      .map(s => {
        totalPlays += s.plays ?? 0;
        totalLikes += s.likes ?? 0;
        totalFavorites += s.favorites ?? 0;
        return { gameId: s.gameId, plays: s.plays ?? 0, likes: s.likes ?? 0, favorites: s.favorites ?? 0 };
      })
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);
    return { totalUsers, totalGuests, totalTeams, totalTournaments, totalActiveMatches, totalPlays, totalLikes, totalFavorites, topGames };
  }
}
