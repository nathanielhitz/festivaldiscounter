import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-0 px-5 py-8 text-sm text-mut">
        <span>© {new Date().getFullYear()} FestivalDiscounter.nl</span>
        <Link href="/over" className="inline-block py-2 hover:text-ink">Over ons</Link>
        <Link href="/contact" className="inline-block py-2 hover:text-ink">Contact</Link>
        <Link href="/privacy" className="inline-block py-2 hover:text-ink">Privacy</Link>
        <span className="basis-full text-xs">
          Sommige links op deze site zijn affiliate-links: wij kunnen een vergoeding ontvangen
          als je via ons een ticket koopt. Jij betaalt nooit meer.
        </span>
      </div>
    </footer>
  );
}
