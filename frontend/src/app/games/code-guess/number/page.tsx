'use client';

import HigherLowerGamePage from '../../higher-lower/HigherLowerGame';

export default function NumberCodeBreakerPage() {
  return (
    <HigherLowerGamePage
      variant="code_breaker_number"
      gameName="Code Breaker: Number Range"
      gameIcon="🔎"
      accentColor="#06b6d4"
    />
  );
}