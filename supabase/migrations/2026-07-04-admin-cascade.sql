-- Fase 2a: festival-verwijdering in de admin moet offers (en hun clicks) mee-verwijderen.
-- Zet de bestaande foreign keys om naar ON DELETE CASCADE.

alter table public.ticket_offers
  drop constraint if exists ticket_offers_festival_id_fkey,
  add constraint ticket_offers_festival_id_fkey
    foreign key (festival_id) references public.festivals (id) on delete cascade;

alter table public.clicks
  drop constraint if exists clicks_offer_id_fkey,
  add constraint clicks_offer_id_fkey
    foreign key (offer_id) references public.ticket_offers (id) on delete cascade;
