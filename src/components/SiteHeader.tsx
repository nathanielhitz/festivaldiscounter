import Link from "next/link";
import Logo from "./Logo";
import MobileNav from "./MobileNav";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur">
      <nav className="relative mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="FestivalDiscounter home" className="py-2">
          <Logo size={22} />
        </Link>
        {/* desktop: inline links met volwaardig tapgebied */}
        <div className="ml-auto hidden gap-1 text-sm font-semibold text-mut sm:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded px-3 py-2.5 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </div>
        {/* mobiel: hamburger rechts */}
        <div className="ml-auto sm:hidden">
          <MobileNav />
        </div>
      </nav>
    </header>
  );
}
