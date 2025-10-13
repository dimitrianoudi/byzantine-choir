import "./globals.css"
import Header from '@/components/Header';
import { getSession } from '@/lib/session';
import { EB_Garamond, Noto_Sans } from "next/font/google";


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
  title: "Βυζαντινή Χορωδία · Ψαλτική Υλικό",
  description: "Podcast και PDF αρχεία για τα μέλη της χορωδίας"
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  const session = await getSession();
  const role = session.user?.role ?? 'member';

  return (
    <html lang="el" className={`${heading.variable} ${text.variable}`}>
      <body>
        <Header role={role} />
        <main className="container py-6">{children}</main>
        <footer className="container py-10 text-center text-white/50 text-sm">© {new Date().getFullYear()}  Ψαλτικοί Χοροί Αγ. Αθανασίου &amp; Ευαγγελισμού Ευόσμου</footer>
      </body>
    </html>
  )
}