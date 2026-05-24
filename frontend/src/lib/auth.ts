import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import { normalizeTeamJoinCode } from '@/lib/teamCodes';

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
const authSecret = process.env.AUTH_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? (process.env.NODE_ENV !== 'production' ? 'online-multi-games-dev-auth-secret' : undefined);

const providers: NextAuthConfig['providers'] = [];

if (hasGoogle) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  );
}

/**
 * Guest provider: visitors need a team join code. The code is validated before
 * auth succeeds, then the guest is registered under that team as a player.
 */
providers.push(
  Credentials({
    id: 'guest',
    name: 'Guest',
    credentials: {
      name: { label: 'Display Name', type: 'text' },
      joinCode: { label: 'Team Code', type: 'text' },
    },
    authorize: async (raw) => {
      const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, 32) : '';
      const joinCode = typeof raw?.joinCode === 'string' ? normalizeTeamJoinCode(raw.joinCode) : '';
      if (!name || !joinCode) return null;
      const team = await getDb().getTeamByJoinCode(joinCode);
      if (!team) return null;
      const id = `guest_${crypto.randomUUID()}`;
      return { id, name, email: undefined, image: undefined, isGuest: true, teamId: team.id } as never;
    },
  }),
);

export const authConfig: NextAuthConfig = {
  providers,
  secret: authSecret,
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // On first sign-in, persist user record + mark guest flag on the token.
        const isGuest = account?.provider === 'guest';
        const id = (user as { id?: string }).id ?? token.sub ?? `anon_${crypto.randomUUID()}`;
        const guestTeamId = isGuest ? (user as { teamId?: string }).teamId : undefined;
        token.sub = id;
        token.name = user.name ?? token.name ?? 'Guest';
        token.email = user.email ?? token.email;
        token.picture = user.image ?? token.picture;
        (token as { isGuest?: boolean }).isGuest = isGuest;
        try {
          const rec = await getDb().upsertUser({
            id,
            name: token.name ?? 'Guest',
            email: typeof token.email === 'string' ? token.email : undefined,
            image: typeof token.picture === 'string' ? token.picture : undefined,
            isGuest,
          });
          // Expose friendCode on the token so it reaches the session
          if (rec.friendCode) {
            (token as { friendCode?: string }).friendCode = rec.friendCode;
          }
          // Bootstrap: the very first signed-in (non-guest) user becomes admin
          // so the admin panel is reachable without a manual DB edit.
          if (!isGuest && rec.role !== 'admin') {
            const all = await getDb().listUsers(500);
            const hasAdmin = all.some(u => u.role === 'admin');
            if (!hasAdmin) {
              await getDb().setUserRole(id, 'admin');
            }
          }
          if (isGuest && guestTeamId) {
            await getDb().addTeamMember(guestTeamId, id, 'player');
          }
        } catch (err) {
          console.error('[auth] upsertUser failed', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub ?? '';
        (session.user as { isGuest?: boolean }).isGuest = Boolean((token as { isGuest?: boolean }).isGuest);
        const fc = (token as { friendCode?: string }).friendCode;
        if (fc) {
          (session.user as { friendCode?: string }).friendCode = fc;
        }
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
