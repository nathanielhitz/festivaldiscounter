import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Neem contact op met FestivalDiscounter.nl.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Contact</h1>
      <div className="prose-dark mt-6">
        <p>
          Vragen, een foutje gespot in een prijs of festivalinformatie, of samenwerken? Mail ons op{" "}
          <a href="mailto:info@festivaldiscounter.nl">info@festivaldiscounter.nl</a>. We reageren
          doorgaans binnen twee werkdagen.
        </p>
        <p>
          Ben je festivalorganisator en klopt er iets niet aan jouw festivalpagina? Mail ons en we
          passen het snel aan.
        </p>
      </div>
    </main>
  );
}
