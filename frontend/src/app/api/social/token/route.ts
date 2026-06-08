import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSocialIdentityToken } from '@/lib/socialToken';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; image?: string | null; isGuest?: boolean } | undefined;
  if (!user?.id || user.isGuest) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    token: createSocialIdentityToken({
      userId: user.id,
      name: user.name || 'Player',
      image: user.image || null,
    }),
  });
}