// frontend/src/app/games/smart-four/[variant]/page.tsx
import SmartFourGamePage from '../SmartFourGame';

export default async function SmartFourVariantPage({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return <SmartFourGamePage variant={variant} />;
}
