import type { Metadata } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/context/GameContext";

export const metadata: Metadata = {
  title: "Arena | Online Multiplayer Games",
  description: "Play exciting real-time multiplayer games with friends. Disappearing Tic-Tac-Toe, Dice Wars, Code Breaker, Memory Flip, and more!",
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
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
