import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-mut">
        <span>© {new Date().getFullYear()} FestivalDiscounter.nl</span>
        <Link href="/over" className="hover:text-ink">Over ons</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <span className="basis-full text-xs">
          Sommige links op deze site zijn affiliate-links: wij kunnen een vergoeding ontvangen
          als je via ons een ticket koopt. Jij betaalt nooit meer.
        </span>
      </div>
    </footer>
  );
}
