// app/layout.tsx
import "./globals.css";
import { EB_Garamond, Noto_Sans } from "next/font/google";
import Header from "@/components/Header";
import { getSession } from "@/lib/session";

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

export const metadata = {
  title: "Ψαλτική Παιδεία",
  description: "Εκπαίδευση στη Βυζαντινή Μουσική",
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
      <body>
        <Header
          isLoggedIn={!!session.isLoggedIn}
          user={{ role: user.role, email: user.email }}
        />
        <main className="section section--flush-right container container--flush-right space-y-6">
          {children}
        </main>
        <footer className="container py-10 text-white/50 text-sm text-center">
          © {new Date().getFullYear()} Ψαλτικοί Χοροί Αγ. Αθανασίου &amp; Ευαγγελισμού Ευόσμου
        </footer>
      </body>
    </html>
  );
}
