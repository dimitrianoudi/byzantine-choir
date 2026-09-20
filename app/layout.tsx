import "./globals.css";
import type { Metadata } from "next";
import { EB_Garamond, Noto_Sans } from "next/font/google";
import Script from "next/script";
import Header from "@/components/Header";
import { getSession } from "@/lib/session";
import ActivityTracker from "@/components/ActivityTracker";
import ButtonMotionEnhancer from "@/components/ButtonMotionEnhancer";
import UsefulOfflineRegistration from "@/components/UsefulOfflineRegistration";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

const heading = EB_Garamond({
  subsets: ["greek", "latin"],
  variable: "--font-heading",
  display: "swap",
});
const text = Noto_Sans({
  subsets: ["greek", "latin"],
  variable: "--font-text",
  display: "swap",
});

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "education",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: googleSiteVerification
    ? { google: googleSiteVerification }
    : undefined,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "el_GR",
    type: "website",
    images: [
      {
        url: "/social-card.jpg",
        width: 1200,
        height: 630,
        alt: "Φροντιστήριο Ψαλτικής Αγίου Αθανασίου και Ευαγγελισμού Ευόσμου",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/social-card.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session.user ?? { role: "member" as const, email: undefined };

  return (
    <html lang="el" className={`${heading.variable} ${text.variable}`}>
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="overflow-x-hidden with-left-ornament with-right-ornament">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5SMV0NMGEY"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5SMV0NMGEY');
          `}
        </Script>
        <div aria-hidden="true" className="left-ornament" />
        <div aria-hidden="true" className="right-ornament" />
        <Header
          isLoggedIn={!!session.isLoggedIn}
          user={{ role: user.role, email: user.email }}
        />
        <ActivityTracker enabled={!!session.isLoggedIn} />
        <ButtonMotionEnhancer />
        <UsefulOfflineRegistration enabled={!!session.isLoggedIn} />
        <main className="section section--flush-right container container--flush-right space-y-6">
          {children}
        </main>
        <footer className="container py-10 text-white/50 text-[14px] text-center">
          © {new Date().getFullYear()} Ψαλτικοί Χοροί Αγ. Αθανασίου &amp; Ευαγγελισμού Ευόσμου
        </footer>
      </body>
    </html>
  );
}
