import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: "Hoe FestivalDiscounter.nl omgaat met je gegevens.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="display text-4xl">Privacyverklaring</h1>
      <div className="prose-dark mt-6">
        <p>FestivalDiscounter.nl is zuinig op je gegevens. Dit is wat we wél en niet verzamelen.</p>
        <h2>Geen cookies, anonieme statistieken</h2>
        <p>
          We gebruiken Vercel Web Analytics: privacyvriendelijke, cookieloze bezoekersstatistieken
          waarbij geen persoonsgegevens of IP-adressen worden opgeslagen. Daarom zie je bij ons ook
          geen cookiebanner.
        </p>
        <h2>Kliks op ticketlinks</h2>
        <p>
          Klik je op &quot;Bekijk tickets&quot;, dan registreren we anoniem dát er op die aanbieder
          is geklikt en vanaf welke pagina. We slaan hierbij geen IP-adres of andere
          persoonsgegevens op.
        </p>
        <h2>Affiliate-links</h2>
        <p>
          Links naar ticketaanbieders kunnen affiliate-links zijn. De aanbieder kan daarbij zelf
          cookies plaatsen op zíjn website; daarop is het privacybeleid van die aanbieder van
          toepassing.
        </p>
        <h2>Contact</h2>
        <p>
          Vragen over privacy? Mail{" "}
          <a href="mailto:info@festivaldiscounter.nl">info@festivaldiscounter.nl</a>.
        </p>
      </div>
    </main>
  );
}
