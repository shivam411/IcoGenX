import HigherLowerGamePage from '../HigherLowerGame';

function normalizeVariant(variant: string) {
  if (variant === 'sprint' || variant === 'expert') return variant;
  return 'classic';
}

export default async function HigherLowerVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant } = await params;

  return <HigherLowerGamePage variant={normalizeVariant(variant)} />;
}