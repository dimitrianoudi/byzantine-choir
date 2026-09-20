import "./globals.css";
import { EB_Garamond, Noto_Sans } from "next/font/google";
import Header from "@/components/Header";
import { getSession } from "@/lib/session";
import Script from "next/script";
import ActivityTracker from "@/components/ActivityTracker";
import ButtonMotionEnhancer from "@/components/ButtonMotionEnhancer";
import UsefulOfflineRegistration from "@/components/UsefulOfflineRegistration";
import type { Metadata } from "next";

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

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";
const metadataBase = new URL(
  siteUrl.startsWith("http://") || siteUrl.startsWith("https://")
    ? siteUrl
    : `https://${siteUrl}`,
);

export const metadata: Metadata = {
  metadataBase,
  title: "Ψαλτική Παιδεία",
  description: "Εκπαίδευση στη Βυζαντινή Μουσική",
  openGraph: {
    title: "Ψαλτική Παιδεία",
    description: "Εκπαίδευση στη Βυζαντινή Μουσική",
    siteName: "Ψαλτική Παιδεία",
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
    title: "Ψαλτική Παιδεία",
    description: "Εκπαίδευση στη Βυζαντινή Μουσική",
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
