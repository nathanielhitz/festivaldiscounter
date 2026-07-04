import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FestivalDiscounter.nl · Festivaltickets vergelijken",
    template: "%s · FestivalDiscounter.nl",
  },
  description:
    "Vergelijk ticketprijzen van officiële verkoop en doorverkoop voor 75+ Nederlandse festivals. Dagelijks gecheckt.",
  openGraph: { locale: "nl_NL", type: "website", images: ["/og-default.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          Direct naar inhoud
        </a>
        <SiteHeader />
        <div id="main" className="flex-1">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
