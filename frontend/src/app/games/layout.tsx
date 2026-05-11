'use client';

import { WebSocketProvider } from '@/context/GameContext';

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  );
}
