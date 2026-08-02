/* frontend/src/app/games/trappex/[variant]/page.tsx */
import TrappexGamePage from '../TrappexGame';

export default async function TrappexVariantPage({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return <TrappexGamePage variant={variant} />;
}
