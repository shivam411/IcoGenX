import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/context/GameContext";
import SessionBanner from "@/components/SessionBanner";

export const metadata: Metadata = {
  title: "Arena | Online Multiplayer Games",
  description: "Play exciting real-time multiplayer games with friends. Disappearing Tic-Tac-Toe, Dice Wars, Code Breaker, Memory Flip, and more!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>
          <SessionBanner />
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
