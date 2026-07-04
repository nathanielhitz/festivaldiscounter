import Link from "next/link";
import { getAllFestivalsForAdmin, offerCount } from "@/lib/admin/queries";
import { deleteFestival } from "@/lib/admin/festival-actions";
import PublishToggle from "@/components/admin/PublishToggle";
import DeleteButton from "@/components/admin/DeleteButton";
import { formatDateRange } from "@/lib/format";

export default async function AdminFestivalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q = "", filter = "all" } = await searchParams;
  const all = await getAllFestivalsForAdmin();
  const term = q.trim().toLowerCase();
  const rows = all.filter((f) => {
    if (filter === "draft" && f.published) return false;
    if (filter === "published" && !f.published) return false;
    if (term && !f.name.toLowerCase().includes(term) && !f.slug.includes(term)) return false;
    return true;
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl">Festivals</h1>
        <Link href="/admin/festivals/new" className="rounded-sm bg-accent px-4 py-2 font-bold text-ground">
          + Nieuw festival
        </Link>
      </div>

      <form className="flex gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op naam of slug…"
          className="flex-1 rounded border border-line bg-panel px-3 py-2"
        />
        <select name="filter" defaultValue={filter} className="rounded border border-line bg-panel px-3 py-2">
          <option value="all">Alle</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
        </select>
        <button className="rounded-sm border border-line px-4 py-2 font-semibold">Filter</button>
      </form>

      <p className="text-sm text-mut">{rows.length} van {all.length} festivals</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-mut">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Naam</th>
              <th className="py-2 pr-3">Datum</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Offers</th>
              <th className="py-2 pr-3">Publicatie</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-line/60">
                <td className="py-2 pr-3 font-semibold">
                  <Link href={`/admin/festivals/${f.id}`} className="hover:text-accent">{f.name}</Link>
                  <span className="block text-xs text-mut">{f.slug}</span>
                </td>
                <td className="py-2 pr-3 text-mut">{formatDateRange(f.start_date, f.end_date)}</td>
                <td className="py-2 pr-3 text-mut">{f.status}</td>
                <td className="py-2 pr-3 tabular-nums">{offerCount(f)}</td>
                <td className="py-2 pr-3"><PublishToggle id={f.id} published={f.published} /></td>
                <td className="py-2 pr-3">
                  <DeleteButton onDelete={deleteFestival.bind(null, f.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
