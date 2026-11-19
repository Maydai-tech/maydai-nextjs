-- UP
create table if not exists public.contact_site (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text null,
  message text null,
  marketing_consent boolean not null default false,
  constraint contact_site_subject_check check (
    subject in (
      'Support & Démo',
      'Presse & Média',
      'Partenariats & Fournisseurs',
      'Carrières',
      'Audit personnalisé'
    )
  )
);

alter table public.contact_site enable row level security;

drop policy if exists "contact_site_insert_anon" on public.contact_site;
create policy "contact_site_insert_anon"
  on public.contact_site
  for insert
  to anon
  with check (true);

-- DOWN
-- (Supabase migrations are typically run UP-only; keep a reversible section for tooling.)
-- To rollback manually, run the statements below:
-- drop policy if exists "contact_site_insert_anon" on public.contact_site;
-- drop table if exists public.contact_site;
