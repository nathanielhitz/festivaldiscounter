-- Fase 2b: prijs-scraper (price_checks) + marktplaats-detectie (offer_suggestions).
-- Beide zijn append-only review-wachtrijen; de publieke site verandert pas na
-- handmatige goedkeuring in /admin/scrapers.

create type review_status as enum ('pending', 'approved', 'rejected', 'failed');

-- Capaciteit A: prijsupdate van een BESTAANDE offer.
create table price_checks (
  id uuid primary key default gen_random_uuid(),
  ticket_offer_id uuid not null references ticket_offers(id) on delete cascade,
  status review_status not null default 'pending',
  scraped_price numeric(8,2),
  scraped_availability ticket_availability,
  failure_reason text,
  checked_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index price_checks_offer_idx on price_checks (ticket_offer_id);
create index price_checks_status_idx on price_checks (status);

-- Capaciteit B: voorgestelde NIEUWE marktplaats-aanbieder.
create table offer_suggestions (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals(id) on delete cascade,
  provider ticket_provider not null,
  detected_url text not null,
  affiliate_url text,
  status review_status not null default 'pending',
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint offer_suggestions_festival_provider_key unique (festival_id, provider)
);

create index offer_suggestions_status_idx on offer_suggestions (status);

-- RLS aan, géén policies: alleen de service-role (server-side) leest/schrijft,
-- net als de andere tabellen in 0001_init.sql.
alter table price_checks enable row level security;
alter table offer_suggestions enable row level security;
