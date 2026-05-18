import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; image?: string; isGuest?: boolean } | undefined;
  if (!user?.id) return NextResponse.json({ user: null, interactions: [] });

  const db = getDb();
  const [profile, interactions] = await Promise.all([
    db.getUser(user.id),
    db.getInteractionsForUser(user.id),
  ]);

  return NextResponse.json({
    user: profile ?? { id: user.id, name: user.name ?? 'Player', image: user.image, isGuest: !!user.isGuest },
    interactions,
  });
}
