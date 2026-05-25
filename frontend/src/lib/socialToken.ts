import { createHmac } from 'crypto';

const DEFAULT_DEV_SOCIAL_SECRET = 'online-multi-games-dev-social-secret';

function socialSecret() {
  return process.env.SOCIAL_TOKEN_SECRET
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET
    ?? DEFAULT_DEV_SOCIAL_SECRET;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: Record<string, unknown>) {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createHmac('sha256', socialSecret()).update(data).digest();
  return `${data}.${base64Url(signature)}`;
}

function exp(secondsFromNow: number) {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

export function createSocialIdentityToken(input: { userId: string; name: string; image?: string | null }) {
  return signJwt({
    kind: 'identity',
    sub: input.userId,
    name: input.name,
    image: input.image ?? null,
    exp: exp(60 * 15),
  });
}

export function createInviteGrant(input: {
  fromUserId: string;
  toUserId: string;
  gameType: string;
  variant?: string | null;
}) {
  return signJwt({
    kind: 'invite',
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    game_type: input.gameType,
    variant: input.variant ?? null,
    exp: exp(60 * 2),
  });
}