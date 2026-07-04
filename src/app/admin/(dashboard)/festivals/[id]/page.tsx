import { notFound } from "next/navigation";
import { getFestivalForAdmin } from "@/lib/admin/queries";
import FestivalForm from "@/components/admin/FestivalForm";
import OfferForm from "@/components/admin/OfferForm";

export default async function EditFestivalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const festival = await getFestivalForAdmin(id);
  if (!festival) notFound();

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="display text-3xl">{festival.name} bewerken</h1>
        <FestivalForm festival={festival} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="display text-2xl">Ticket-aanbieders</h2>
        {festival.ticket_offers.map((offer) => (
          <OfferForm key={offer.id} festivalId={festival.id} offer={offer} />
        ))}
        <h3 className="mt-2 text-sm font-semibold text-mut">Nieuwe aanbieder toevoegen</h3>
        <OfferForm festivalId={festival.id} />
      </div>
    </section>
  );
}
