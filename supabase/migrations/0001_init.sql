create extension if not exists "pgcrypto";

create type festival_status as enum ('announced','tickets_live','sold_out','cancelled','past');
create type ticket_provider as enum ('official','ticketswap','gigsberg','ticombo');
create type ticket_availability as enum ('available','limited','sold_out','unknown');

create table festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  genres text[] not null default '{}',
  lineup text,
  city text not null,
  venue text,
  province text not null,
  country text not null default 'NL',
  start_date date not null,
  end_date date not null,
  image_url text,
  website_url text,
  status festival_status not null default 'announced',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_offers (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references festivals(id) on delete cascade,
  provider ticket_provider not null,
  price_from numeric(8,2),
  currency text not null default 'EUR',
  url text not null,
  affiliate_url text,
  availability ticket_availability not null default 'unknown',
  last_checked_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz
);

create table clicks (
  id bigint generated always as identity primary key,
  offer_id uuid not null references ticket_offers(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referer text
);

create index festivals_published_start_idx on festivals (published, start_date);
create index ticket_offers_festival_idx on ticket_offers (festival_id);
create index clicks_offer_idx on clicks (offer_id);

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger festivals_updated_at
  before update on festivals
  for each row execute function set_updated_at();

-- RLS aan, géén policies: anonieme toegang is overal geblokkeerd.
-- De site leest server-side met de service-role key (omzeilt RLS).
alter table festivals enable row level security;
alter table ticket_offers enable row level security;
alter table articles enable row level security;
alter table clicks enable row level security;
