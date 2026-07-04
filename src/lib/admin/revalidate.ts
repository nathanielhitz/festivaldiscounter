import { revalidatePath, revalidateTag } from "next/cache";

// Bust alle publieke pagina's die festivaldata tonen, plus de getagde data-cache
// van de /festivals-lijst. Aanroepen na elke schrijf-actie op festivals/offers.
export function revalidatePublicFestivalPages(): void {
  revalidatePath("/");
  revalidatePath("/festivals");
  revalidatePath("/festivals/[slug]", "page");
  revalidatePath("/goedkope-festivaltickets");
  revalidatePath("/last-minute-festivals");
  revalidatePath("/agenda/[maand]", "page");
  revalidatePath("/sitemap.xml");
  revalidateTag("festivals");
}
