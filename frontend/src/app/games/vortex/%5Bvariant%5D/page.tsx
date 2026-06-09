// frontend/src/app/games/vortex/[variant]/page.tsx
import VortexGamePage from '../VortexGame';

interface PageProps {
  params: Promise<{
    variant: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { variant } = await params;
  return <VortexGamePage variant={variant} />;
}
