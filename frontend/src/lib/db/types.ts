/**
 * Storage adapter interface — memory + mongo.
 *
 * Roles:
 *  - admin              : full access (admin panel)
 *  - tournament_manager : create/manage tournaments
 *  - player (default)
 *  - team roles are per-team, tracked on TeamMembership.role
 */

export type UserRole = 'admin' | 'tournament_manager' | 'player';

export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  image?: string;
  isGuest: boolean;
  createdAt: number;
  role?: UserRole;
}

export interface GameSocialRecord {
  gameId: string;
  likes: number;
  plays: number;
  favorites: number;
}

export interface UserGameInteraction {
  userId: string;
  gameId: string;
  liked: boolean;
  favorited: boolean;
  plays: number;
  updatedAt: number;
}

// ---------- Teams ----------

export type TeamMemberRole = 'captain' | 'manager' | 'player';

export interface TeamRecord {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  description?: string;
  ownerId: string;
  createdAt: number;
}

export interface TeamMembership {
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: number;
}

/** Live match advertised to teammates so they can spectate / jump in. */
export interface ActiveMatchRecord {
  id: string;
  teamId: string;
  gameId: string;
  roomCode: string;
  variant?: string;
  hostUserId: string;
  hostName: string;
  createdAt: number;
  endedAt?: number;
}

// ---------- Tournaments ----------

export type TournamentFormat = 'knockout';
export type TournamentStatus = 'draft' | 'live' | 'completed';

export interface TournamentParticipant {
  id: string;        // uuid local to the tournament
  name: string;
  userId?: string;
  teamId?: string;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  slot: number;
  p1Id: string | null;
  p2Id: string | null;
  winnerId: string | null;
  scoreP1?: number;
  scoreP2?: number;
  scheduledAt?: number;
  roomCode?: string;
}

export interface TournamentRecord {
  id: string;
  name: string;
  gameId: string;
  format: TournamentFormat;
  status: TournamentStatus;
  organizerId: string;
  teamId?: string;
  createdAt: number;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  bracketSize?: number;
}

// ---------- Analytics ----------

export interface AnalyticsSnapshot {
  totalUsers: number;
  totalGuests: number;
  totalTeams: number;
  totalTournaments: number;
  totalActiveMatches: number;
  totalPlays: number;
  totalLikes: number;
  totalFavorites: number;
  topGames: Array<{ gameId: string; plays: number; likes: number; favorites: number }>;
}

// ---------- Adapter ----------

export interface DbAdapter {
  readonly mode: 'memory' | 'mongo';

  // Users
  upsertUser(user: Omit<UserRecord, 'createdAt'> & { createdAt?: number }): Promise<UserRecord>;
  getUser(id: string): Promise<UserRecord | null>;
  listUsers(limit?: number): Promise<UserRecord[]>;
  setUserRole(userId: string, role: UserRole): Promise<UserRecord | null>;

  // Social
  getGameSocial(gameId: string): Promise<GameSocialRecord>;
  getGameSocialMany(gameIds: string[]): Promise<Record<string, GameSocialRecord>>;
  getInteraction(userId: string, gameId: string): Promise<UserGameInteraction | null>;
  getInteractionsForUser(userId: string): Promise<UserGameInteraction[]>;
  setLike(userId: string, gameId: string, liked: boolean): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction }>;
  setFavorite(userId: string, gameId: string, favorited: boolean): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction }>;
  incrementPlay(userId: string | null, gameId: string): Promise<{ social: GameSocialRecord; interaction: UserGameInteraction | null }>;

  // Teams
  createTeam(input: { name: string; slug: string; description?: string; ownerId: string }): Promise<TeamRecord>;
  getTeam(id: string): Promise<TeamRecord | null>;
  getTeamBySlug(slug: string): Promise<TeamRecord | null>;
  getTeamByJoinCode(joinCode: string): Promise<TeamRecord | null>;
  rotateTeamJoinCode(teamId: string): Promise<TeamRecord | null>;
  listTeams(limit?: number): Promise<TeamRecord[]>;
  listTeamsForUser(userId: string): Promise<Array<TeamRecord & { role: TeamMemberRole }>>;
  addTeamMember(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMembership>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  setTeamMemberRole(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMembership | null>;
  listTeamMembers(teamId: string): Promise<Array<TeamMembership & { user: UserRecord | null }>>;
  getTeamMembership(teamId: string, userId: string): Promise<TeamMembership | null>;

  // Active matches
  announceMatch(input: Omit<ActiveMatchRecord, 'id' | 'createdAt'>): Promise<ActiveMatchRecord>;
  endMatch(matchId: string): Promise<void>;
  listActiveMatches(teamId: string): Promise<ActiveMatchRecord[]>;
  listAllActiveMatches(limit?: number): Promise<ActiveMatchRecord[]>;

  // Tournaments
  createTournament(input: Omit<TournamentRecord, 'id' | 'createdAt' | 'participants' | 'matches' | 'status'> & { status?: TournamentStatus }): Promise<TournamentRecord>;
  getTournament(id: string): Promise<TournamentRecord | null>;
  listTournaments(opts?: { organizerId?: string; teamId?: string; limit?: number }): Promise<TournamentRecord[]>;
  updateTournament(id: string, patch: Partial<Pick<TournamentRecord, 'name' | 'status' | 'gameId'>>): Promise<TournamentRecord | null>;
  setParticipants(id: string, participants: TournamentParticipant[]): Promise<TournamentRecord | null>;
  setMatches(id: string, matches: TournamentMatch[]): Promise<TournamentRecord | null>;
  updateMatch(tournamentId: string, matchId: string, patch: Partial<TournamentMatch>): Promise<TournamentRecord | null>;
  deleteTournament(id: string): Promise<void>;

  // Analytics
  getAnalytics(): Promise<AnalyticsSnapshot>;
}
