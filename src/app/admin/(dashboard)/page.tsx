import Link from "next/link";
import { getAdminCounts } from "@/lib/admin/queries";

export default async function AdminHome() {
  const { published, draft, total } = await getAdminCounts();
  const cards = [
    { label: "Gepubliceerd", value: published },
    { label: "Concept", value: draft },
    { label: "Totaal", value: total },
  ];
  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded border border-line bg-panel p-4">
            <p className="text-sm text-mut">{c.label}</p>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href="/admin/festivals" className="rounded-sm bg-accent px-4 py-2 font-bold text-ground">
          Festivals beheren
        </Link>
        <Link href="/admin/review" className="rounded-sm border border-line px-4 py-2 font-semibold">
          Review-wachtrij ({draft})
        </Link>
      </div>
    </section>
  );
}
