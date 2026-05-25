import CheckersGamePage from '../CheckersGame';

export default async function CheckersVariantPage({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return <CheckersGamePage variant={variant} />;
}