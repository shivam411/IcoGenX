import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/context/GameContext";
import SessionBanner from "@/components/SessionBanner";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import ConsentBanner from "@/components/ConsentBanner";
import GameInviteBanner from "@/components/GameInviteBanner";
import SocialDock from "@/components/SocialDock";

export const metadata: Metadata = {
  metadataBase: new URL('https://icogenx.com'),
  title: {
    default: "Free 2-Player Online Games | Play Browser Games | IcoGenX",
    template: "%s | IcoGenX",
  },
  description: "Play 36+ free 2-player online browser games with friends. Instant room code matches, no download or sign-up required.",
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://icogenx.com',
    siteName: 'IcoGenX',
    title: 'Free 2-Player Online Games | Play Browser Games | IcoGenX',
    description: 'Play 36+ free 2-player online browser games with friends. Instant room code matches, no install required.',
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'IcoGenX Free Online Games' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free 2-Player Online Games | Play Browser Games | IcoGenX',
    description: 'Play 36+ free 2-player online browser games with friends.',
    images: ['/icon.svg'],
  },
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
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://icogenx.com/#organization',
    name: 'IcoGenX',
    url: 'https://icogenx.com/',
    logo: 'https://icogenx.com/icon.svg',
    sameAs: [
      'https://github.com/shivam411/IcoGenX',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://icogenx.com/#website',
    url: 'https://icogenx.com/',
    name: 'IcoGenX',
    description: 'Free 2-Player Online Browser Games',
    publisher: {
      '@id': 'https://icogenx.com/#organization',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://icogenx.com/?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <AuthSessionProvider>
          <WebSocketProvider>
            <SiteHeader />
            <SessionBanner />
            {children}
            <GameInviteBanner />
            <SocialDock />
            <ConsentBanner />
            <SiteFooter />
          </WebSocketProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
