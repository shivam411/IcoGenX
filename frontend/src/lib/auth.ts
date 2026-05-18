import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

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
 * Guest provider: lets visitors create an ephemeral profile by name only.
 * The "credential" is just a name. We mint a stable, prefixed id so guest
 * accounts can't collide with OAuth subs.
 */
providers.push(
  Credentials({
    id: 'guest',
    name: 'Guest',
    credentials: {
      name: { label: 'Display Name', type: 'text' },
    },
    authorize: async (raw) => {
      const name = typeof raw?.name === 'string' ? raw.name.trim().slice(0, 32) : '';
      if (!name) return null;
      const id = `guest_${crypto.randomUUID()}`;
      return { id, name, email: undefined, image: undefined, isGuest: true } as never;
    },
  }),
);

export const authConfig: NextAuthConfig = {
  providers,
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
          // Bootstrap: the very first signed-in (non-guest) user becomes admin
          // so the admin panel is reachable without a manual DB edit.
          if (!isGuest && rec.role !== 'admin') {
            const all = await getDb().listUsers(500);
            const hasAdmin = all.some(u => u.role === 'admin');
            if (!hasAdmin) {
              await getDb().setUserRole(id, 'admin');
            }
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
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
