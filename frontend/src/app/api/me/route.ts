import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; image?: string; isGuest?: boolean } | undefined;
  if (!user?.id) return NextResponse.json({ user: null, interactions: [], teams: [] });

  const db = getDb();
  const [profile, interactions, teams] = await Promise.all([
    db.getUser(user.id),
    db.getInteractionsForUser(user.id),
    db.listTeamsForUser(user.id),
  ]);

  return NextResponse.json({
    user: profile ?? { id: user.id, name: user.name ?? 'Player', image: user.image, isGuest: !!user.isGuest, role: 'player' },
    interactions,
    teams,
  });
}
