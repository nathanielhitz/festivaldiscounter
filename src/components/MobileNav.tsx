"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/festivals", label: "Festivals" },
  { href: "/last-minute-festivals", label: "Last-minute" },
  { href: "/goedkope-festivaltickets", label: "Goedkope tickets" },
  { href: "/gids", label: "Gids" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // menu sluiten na navigatie
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobiel-menu"
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        className="flex h-11 w-11 items-center justify-center rounded text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        {/* hamburger / kruis, puur CSS zodat er geen icon-dependency nodig is */}
        <span className="relative block h-4 w-5" aria-hidden>
          <span className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition ${open ? "top-2 rotate-45" : ""}`} />
          <span className={`absolute left-0 top-2 h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`absolute left-0 top-4 h-0.5 w-5 bg-current transition ${open ? "top-2 -rotate-45" : ""}`} />
        </span>
      </button>

      {open && (
        <nav
          id="mobiel-menu"
          aria-label="Hoofdmenu"
          className="absolute inset-x-0 top-full border-b border-line bg-ground/95 backdrop-blur"
        >
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={pathname === n.href ? "page" : undefined}
                  className="block border-t border-line px-5 py-3.5 text-base font-semibold text-ink active:bg-panel"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
