import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Badside Monitor — RKRP",
  description: "FiveM badside faction monitoring & statistics",
};

function Nav() {
  return (
    <nav className="flex items-center gap-6 px-8 h-12 border-b border-[var(--border)] text-sm bg-[var(--card)]/80 backdrop-blur-sm sticky top-0 z-50">
      <a href="/" className="font-bold text-[var(--accent)] tracking-tight text-base">
        <i className="fas fa-shield-halved mr-2" />
        BADSIDE MONITOR
      </a>
      <a href="/servers" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5">
        <i className="fas fa-server text-xs" />
        Servers
      </a>
      <a href="/search" className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5">
        <i className="fas fa-magnifying-glass text-xs" />
        Search
      </a>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" crossOrigin="anonymous" />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
