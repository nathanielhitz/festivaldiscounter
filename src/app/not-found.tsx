import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-24 text-center">
      <h1 className="display text-5xl">Pagina niet gevonden</h1>
      <p className="mx-auto mt-4 max-w-md text-mut">
        Deze pagina bestaat niet (meer). Zoek een festival of bekijk het volledige overzicht.
      </p>
      <form action="/festivals" className="mx-auto mt-8 flex max-w-md gap-1.5 rounded border border-line bg-panel p-1.5">
        <input
          type="search"
          name="q"
          placeholder="Zoek een festival…"
          aria-label="Zoek een festival"
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-ink placeholder:text-mut focus:outline-none"
        />
        <button className="rounded-sm bg-accent px-6 font-bold text-ground">Zoek</button>
      </form>
      <Link href="/festivals" className="mt-6 inline-block font-semibold text-accent hover:underline">
        Alle festivals →
      </Link>
    </main>
  );
}
