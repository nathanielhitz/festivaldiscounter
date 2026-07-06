import {
  getPendingPriceChecks,
  getPendingOfferSuggestions,
  getFailedPriceChecks,
  getRecentAutoAppliedPriceChecks,
} from "@/lib/admin/scraper-queries";
import {
  approvePriceCheck,
  rejectPriceCheck,
  approveOfferSuggestion,
  rejectOfferSuggestion,
} from "@/lib/admin/scraper-actions";
import ReviewButtons from "@/components/admin/ReviewButtons";

function euro(n: number | null): string {
  return n === null ? "—" : `€ ${n.toFixed(2).replace(".", ",")}`;
}

function relativeTime(iso: string): string {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "zojuist";
  if (hours < 24) return `${hours}u geleden`;
  return `${Math.round(hours / 24)}d geleden`;
}

export default async function ScrapersPage() {
  const [priceChecks, suggestions, failures, autoApplied] = await Promise.all([
    getPendingPriceChecks(),
    getPendingOfferSuggestions(),
    getFailedPriceChecks(),
    getRecentAutoAppliedPriceChecks(),
  ]);
  const actionCount = priceChecks.length + suggestions.length;

  return (
    <section className="flex flex-col gap-10">
      <div>
        <h1 className="display text-3xl">Scrapers</h1>
        <p className="mt-1 text-sm text-mut">
          {actionCount === 0
            ? "Niets te reviewen — helemaal bij."
            : `${actionCount} ${actionCount === 1 ? "item wacht" : "items wachten"} op jouw beoordeling.`}
        </p>
      </div>

      {/* Sectie 1: prijs-updates */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Prijs-updates te reviewen ({priceChecks.length})</h2>
        {priceChecks.length === 0 && <p className="text-mut">Niets te reviewen.</p>}
        {priceChecks.map((pc) => {
          const off = pc.ticket_offers;
          const fest = off?.festivals;
          return (
            <article
              key={pc.id}
              className="flex flex-col gap-3 rounded border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <p className="font-bold">{fest?.name ?? "Onbekend festival"} <span className="font-normal text-mut">· {off?.provider}</span></p>
                <p className="text-mut">
                  Prijs: {euro(off?.price_from ?? null)} → <span className="text-accent">{euro(pc.scraped_price)}</span>
                  {" · "}Beschikbaarheid: {off?.availability} → <span className="text-accent">{pc.scraped_availability ?? "—"}</span>
                </p>
              </div>
              <ReviewButtons
                onApprove={approvePriceCheck.bind(null, pc.id)}
                onReject={rejectPriceCheck.bind(null, pc.id)}
              />
            </article>
          );
        })}
      </div>

      {/* Sectie 2: voorgestelde nieuwe aanbieders */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Voorgestelde nieuwe aanbieders ({suggestions.length})</h2>
        {suggestions.length === 0 && <p className="text-mut">Geen voorstellen.</p>}
        {suggestions.map((s) => (
          <article
            key={s.id}
            className="flex flex-col gap-3 rounded border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm">
              <p className="font-bold">{s.festivals?.name ?? "Onbekend festival"} <span className="font-normal text-mut">· {s.provider}</span></p>
              <a href={s.detected_url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                {s.detected_url}
              </a>
              {!s.affiliate_url && <span className="ml-2 text-xs text-warn">(nog geen affiliate-link)</span>}
            </div>
            <ReviewButtons
              onApprove={approveOfferSuggestion.bind(null, s.id)}
              onReject={rejectOfferSuggestion.bind(null, s.id)}
              approveLabel="Toevoegen"
              rejectLabel="Afwijzen"
            />
          </article>
        ))}
      </div>

      {/* Sectie 3: automatisch toegepast (geen actie nodig, puur ter inzage) */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Automatisch toegepast ({autoApplied.length})</h2>
        <p className="text-sm text-mut">
          Kleine prijswijzigingen (binnen ±30%, zonder sold-out-signaal) worden meteen live gezet
          — hier alleen ter controle. Grote sprongen en uitverkocht-meldingen blijven altijd
          hierboven staan voor handmatige goedkeuring.
        </p>
        {autoApplied.length === 0 && <p className="text-mut">Nog niets automatisch toegepast.</p>}
        {autoApplied.map((a) => (
          <article key={a.id} className="rounded border border-line/60 bg-panel/60 p-3 text-sm">
            <p>
              <span className="font-bold">{a.ticket_offers?.festivals?.name ?? "Onbekend festival"}</span>
              {" → "}
              {euro(a.scraped_price)}
              {a.scraped_availability && ` · ${a.scraped_availability}`}
              <span className="ml-2 text-xs text-mut">{relativeTime(a.checked_at)}</span>
            </p>
          </article>
        ))}
      </div>

      {/* Sectie 4: mislukt */}
      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Mislukt ({failures.length})</h2>
        {failures.length === 0 && <p className="text-mut">Geen mislukte scrapes.</p>}
        {failures.map((f) => (
          <article key={f.id} className="rounded border border-warn/30 bg-panel p-4 text-sm">
            <p className="font-bold">{f.ticket_offers?.festivals?.name ?? "Onbekend festival"}</p>
            <p className="text-mut">{f.failure_reason ?? "onbekende fout"}</p>
            {f.ticket_offers?.url && (
              <a href={f.ticket_offers.url} target="_blank" rel="noreferrer" className="text-accent underline break-all">
                {f.ticket_offers.url}
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
