// frontend/src/app/games/tabletop-pinball/[variant]/page.tsx
import TabletopPinballGamePage from '../TabletopPinballGame';

interface PageProps {
  params: Promise<{
    variant: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { variant } = await params;
  return <TabletopPinballGamePage variant={variant} />;
}
