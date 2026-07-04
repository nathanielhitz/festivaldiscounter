import { getDraftFestivalsForAdmin } from "@/lib/admin/queries";
import ReviewActions from "@/components/admin/ReviewActions";
import { formatDateRange } from "@/lib/format";

export default async function ReviewPage() {
  const drafts = await getDraftFestivalsForAdmin();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="display text-3xl">Review-wachtrij</h1>
      <p className="text-sm text-mut">{drafts.length} concept-festivals</p>

      {drafts.length === 0 && <p className="text-mut">Geen concepten meer — alles is beoordeeld. 🎉</p>}

      <div className="flex flex-col gap-3">
        {drafts.map((f) => (
          <article key={f.id} className="rounded border border-line bg-panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{f.name} <span className="text-xs font-normal text-mut">/{f.slug}</span></h2>
                <p className="text-sm text-mut">
                  {formatDateRange(f.start_date, f.end_date)} · {f.city}, {f.province} · {f.status} · {f.ticket_offers.length} aanbieders
                </p>
                <p className="mt-2 line-clamp-3 text-sm">{f.description}</p>
              </div>
            </div>
            <div className="mt-3">
              <ReviewActions id={f.id} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
