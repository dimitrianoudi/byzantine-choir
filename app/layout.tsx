import "./globals.css"
import { ReactNode } from "react"

export const metadata = {
  title: "Βυζαντινή Χορωδία · Ψαλτική Υλικό",
  description: "Podcast και PDF αρχεία για τα μέλη της χορωδίας"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="el">
      <body>
        <header className="border-b border-white/10">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="" className="w-8 h-8" />
              <h1 className="text-lg font-semibold">Βυζαντινή Χορωδία</h1>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <a href="/" className="btn">Υλικό</a>
              <a href="/upload" className="btn">Ανέβασμα</a>
              <form action="/api/logout" method="post">
                <button className="btn" type="submit">Έξοδος</button>
              </form>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="container py-10 text-center text-white/50 text-sm">© {new Date().getFullYear()} Βυζαντινή Χορωδία</footer>
      </body>
    </html>
  )
}