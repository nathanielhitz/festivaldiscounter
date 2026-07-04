import FestivalForm from "@/components/admin/FestivalForm";

export default function NewFestivalPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="display text-3xl">Nieuw festival</h1>
      <FestivalForm />
    </section>
  );
}
