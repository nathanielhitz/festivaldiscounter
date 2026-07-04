import { notFound } from "next/navigation";
import { getFestivalForAdmin } from "@/lib/admin/queries";
import FestivalForm from "@/components/admin/FestivalForm";

export default async function EditFestivalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const festival = await getFestivalForAdmin(id);
  if (!festival) notFound();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">{festival.name} bewerken</h1>
      <FestivalForm festival={festival} />
      {/* Ticket-aanbieders-sectie wordt toegevoegd in de volgende taak */}
    </section>
  );
}
