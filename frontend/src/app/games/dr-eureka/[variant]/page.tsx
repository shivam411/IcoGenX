/* frontend/src/app/games/dr-eureka/[variant]/page.tsx */
import DrEurekaGamePage from '../DrEurekaGame';

export default async function DrEurekaVariantPage({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  return <DrEurekaGamePage variant={variant} />;
}
