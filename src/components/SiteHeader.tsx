import Link from "next/link";
import Logo from "./Logo";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function SiteHeader() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4">
        <Link href="/" aria-label="FestivalDiscounter home"><Logo /></Link>
        <div className="ml-auto flex flex-wrap gap-5 text-sm font-semibold text-mut">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
