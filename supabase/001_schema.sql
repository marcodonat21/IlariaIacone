-- =====================================================================
-- Agenda professionisti (Emme alla Enne) — schema iniziale
-- Primo studio: Ilaria Iacone, Biologa Nutrizionista
-- Ogni dato appartiene a uno "studio" (professionista): chi accede vede
-- solo gli studi di cui è membro (Row Level Security).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- studi (professionisti clienti) ----------
create table if not exists public.studi (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  nome          text not null,
  professione   text,
  email         text,
  whatsapp      text,
  sito          text,
  fuso          text not null default 'Europe/Rome',
  giorni_avanti int  not null default 21 check (giorni_avanti between 1 and 120),
  preavviso_ore int  not null default 0  check (preavviso_ore between 0 and 168),
  passo_min     int  not null default 30 check (passo_min in (10,15,20,30,60)),
  colore        text not null default '#B62432',
  creato        timestamptz not null default now()
);

-- ---------- membri: chi può usare l'agenda di uno studio ----------
-- ruolo: 'titolare' (tutto), 'segreteria' (agenda e pazienti), 'contabile' (solo incassi/fatture)
create table if not exists public.membri (
  studio_id uuid not null references public.studi(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  ruolo     text not null default 'titolare' check (ruolo in ('titolare','segreteria','contabile')),
  creato    timestamptz not null default now(),
  primary key (studio_id, user_id)
);

-- funzioni di aiuto per le regole di accesso (security definer: leggono membri senza ricorsione)
create or replace function public.mio_ruolo(p_studio uuid)
returns text language sql stable security definer set search_path = public as $$
  select ruolo from public.membri where studio_id = p_studio and user_id = auth.uid()
$$;

create or replace function public.posso(p_studio uuid, p_ruoli text[] default array['titolare','segreteria'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.membri
                where studio_id = p_studio and user_id = auth.uid() and ruolo = any(p_ruoli))
$$;

-- ---------- sedi, orari, prestazioni ----------
create table if not exists public.sedi (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studi(id) on delete cascade,
  nome       text not null,
  struttura  text,
  indirizzo  text,
  lat        double precision,
  lon        double precision,
  ordine     int not null default 0,
  attiva     boolean not null default true
);

create table if not exists public.orari (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studi(id) on delete cascade,
  giorno     int  not null check (giorno between 0 and 6),   -- 0 = domenica
  sede_id    uuid not null references public.sedi(id) on delete cascade,
  inizio     time not null,
  fine       time not null,
  check (fine > inizio)
);

create table if not exists public.prestazioni (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studi(id) on delete cascade,
  nome       text not null,
  descrizione text,
  durata_min int  not null check (durata_min between 5 and 480),
  prezzo     numeric(8,2),
  famiglia   text not null default 't2' check (famiglia in ('t1','t2','t3','t4')),
  online     boolean not null default true,   -- prenotabile dal sito
  ordine     int not null default 0,
  attiva     boolean not null default true
);

-- ---------- pazienti ----------
create table if not exists public.pazienti (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studi(id) on delete cascade,
  nome       text not null,
  cognome    text,
  telefono   text,
  email      text,
  cf         text,
  indirizzo  text,
  cap        text,
  citta      text,
  prov       text,
  nascita    date,
  note       text,
  consenso_privacy timestamptz,
  creato     timestamptz not null default now()
);
create index if not exists pazienti_studio_tel on public.pazienti(studio_id, telefono);
create index if not exists pazienti_studio_nome on public.pazienti(studio_id, lower(cognome), lower(nome));

-- ---------- appuntamenti ----------
create table if not exists public.appuntamenti (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studi(id) on delete cascade,
  paziente_id    uuid references public.pazienti(id) on delete set null,
  sede_id        uuid references public.sedi(id) on delete set null,
  prestazione_id uuid references public.prestazioni(id) on delete set null,
  tipo           text,                       -- nome della prestazione al momento della prenotazione
  inizio         timestamptz not null,
  fine           timestamptz not null,
  stato          text not null default 'da_confermare'
                 check (stato in ('da_confermare','confermato','annullato','svolto','assente')),
  origine        text not null default 'agenda' check (origine in ('sito','agenda')),
  note           text,
  promemoria_wa  timestamptz,                -- quando Ilaria ha mandato il promemoria WhatsApp
  creato         timestamptz not null default now(),
  check (fine > inizio)
);
create index if not exists app_studio_inizio on public.appuntamenti(studio_id, inizio);

-- ---------- blocchi (ferie, pause, impegni) ----------
create table if not exists public.blocchi (
  id         uuid primary key default gen_random_uuid(),
  studio_id  uuid not null references public.studi(id) on delete cascade,
  inizio     timestamptz not null,
  fine       timestamptz not null,
  motivo     text,
  check (fine > inizio)
);
create index if not exists blocchi_studio_inizio on public.blocchi(studio_id, inizio);

-- ---------- incassi e fatture ----------
create table if not exists public.incassi (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studi(id) on delete cascade,
  paziente_id     uuid references public.pazienti(id) on delete set null,
  appuntamento_id uuid references public.appuntamenti(id) on delete set null,
  data            date not null default current_date,
  importo         numeric(8,2) not null check (importo >= 0),
  metodo          text not null default 'pos' check (metodo in ('pos','contanti','bonifico','altro')),
  descrizione     text,
  fattura_num     text,
  fattura_data    date,
  creato          timestamptz not null default now()
);
create index if not exists incassi_studio_data on public.incassi(studio_id, data);

-- ---------- misurazioni ----------
create table if not exists public.misurazioni (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studi(id) on delete cascade,
  paziente_id  uuid not null references public.pazienti(id) on delete cascade,
  data         date not null default current_date,
  peso         numeric(5,2),
  altezza      numeric(5,1),
  vita         numeric(5,1),
  fianchi      numeric(5,1),
  massa_grassa numeric(4,1),
  note         text,
  creato       timestamptz not null default now()
);

-- ---------- lista d'attesa ----------
create table if not exists public.lista_attesa (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studi(id) on delete cascade,
  paziente_id uuid references public.pazienti(id) on delete cascade,
  nome        text,
  telefono    text,
  preferenze  text,
  creato      timestamptz not null default now()
);

-- =====================================================================
-- Regole di accesso (RLS)
-- =====================================================================
alter table public.studi        enable row level security;
alter table public.membri       enable row level security;
alter table public.sedi         enable row level security;
alter table public.orari        enable row level security;
alter table public.prestazioni  enable row level security;
alter table public.pazienti     enable row level security;
alter table public.appuntamenti enable row level security;
alter table public.blocchi      enable row level security;
alter table public.incassi      enable row level security;
alter table public.misurazioni  enable row level security;
alter table public.lista_attesa enable row level security;

-- studi e membri: ognuno vede i propri; il titolare modifica il suo studio
drop policy if exists studi_vedi on public.studi;
create policy studi_vedi on public.studi for select to authenticated
  using (public.posso(id, array['titolare','segreteria','contabile']));
drop policy if exists studi_modifica on public.studi;
create policy studi_modifica on public.studi for update to authenticated
  using (public.posso(id, array['titolare'])) with check (public.posso(id, array['titolare']));

drop policy if exists membri_vedi on public.membri;
create policy membri_vedi on public.membri for select to authenticated
  using (user_id = auth.uid() or public.posso(studio_id, array['titolare']));

-- tabelle dell'agenda: titolare e segreteria fanno tutto
do $$
declare t text;
begin
  foreach t in array array['sedi','orari','prestazioni','pazienti','appuntamenti','blocchi','misurazioni','lista_attesa'] loop
    execute format('drop policy if exists %1$s_tutto on public.%1$s', t);
    execute format('create policy %1$s_tutto on public.%1$s for all to authenticated
                    using (public.posso(studio_id)) with check (public.posso(studio_id))', t);
  end loop;
end $$;

-- incassi: titolare, segreteria e contabile (la contabile vede solo questi)
drop policy if exists incassi_tutto on public.incassi;
create policy incassi_tutto on public.incassi for all to authenticated
  using (public.posso(studio_id, array['titolare','segreteria','contabile']))
  with check (public.posso(studio_id, array['titolare','segreteria','contabile']));

-- la contabile vede nome e codice fiscale dei pazienti che hanno pagato (per fatturare)
drop policy if exists pazienti_contabile on public.pazienti;
create policy pazienti_contabile on public.pazienti for select to authenticated
  using (public.posso(studio_id, array['contabile'])
         and exists(select 1 from public.incassi i where i.paziente_id = pazienti.id));

-- permessi sulle tabelle per gli utenti collegati (le righe le filtra RLS)
grant usage on schema public to anon, authenticated;
grant select, update on public.studi to authenticated;
grant select on public.membri to authenticated;
grant select, insert, update, delete on
  public.sedi, public.orari, public.prestazioni, public.pazienti, public.appuntamenti,
  public.blocchi, public.incassi, public.misurazioni, public.lista_attesa
  to authenticated;
