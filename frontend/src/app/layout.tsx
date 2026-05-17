import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/context/GameContext";
import SessionBanner from "@/components/SessionBanner";

export const metadata: Metadata = {
  title: "IcoGenX.com | Next Generation Indie Multiplayer gaming",
  description: "Next Generation Indie Multiplayer gaming with real-time browser rooms, quick variants, and friend-ready matches.",
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
