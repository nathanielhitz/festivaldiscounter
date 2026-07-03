import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over FestivalDiscounter",
  description: "Wie we zijn, hoe we ticketprijzen vergelijken en hoe we geld verdienen.",
};

export default function OverPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Over FestivalDiscounter</h1>
      <div className="prose-dark mt-6">
        <p>
          FestivalDiscounter.nl vergelijkt ticketprijzen voor Nederlandse festivals. We tonen per
          festival de vanaf-prijzen van de officiële verkoop en van doorverkoopplatforms zoals
          TicketSwap, Gigsberg en Ticombo, met de datum waarop we de prijs voor het laatst checkten.
        </p>
        <h2>Hoe verdienen we geld?</h2>
        <p>
          Sommige links naar aanbieders zijn affiliate-links: koop je via zo&apos;n link een ticket,
          dan ontvangen wij een vergoeding van de aanbieder. Jij betaalt daardoor nooit meer — de
          prijs is exact dezelfde. Vergoedingen hebben geen invloed op de volgorde waarin we
          aanbieders tonen: we sorteren op prijs, en bij uitverkochte festivals tonen we
          doorverkoopaanbieders eerst omdat je daar dan als enige terechtkunt.
        </p>
        <h2>Onafhankelijk</h2>
        <p>
          We verkopen zelf geen tickets en zijn geen onderdeel van een ticketplatform of
          festivalorganisatie. Klopt er iets niet aan een prijs of festival? Laat het ons weten via
          de contactpagina.
        </p>
      </div>
    </main>
  );
}
