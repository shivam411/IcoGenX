import DropFourGamePage from '../DropFourGame';

export default async function DropFourVariantPage({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return <DropFourGamePage variant={variant} />;
}