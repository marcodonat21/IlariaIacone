-- =====================================================================
-- 004 — tutte le funzioni dell'agenda Google
-- incassi completi, fatture numerate, misurazioni complete, lista d'attesa,
-- dati fiscali dello studio, scheda dati compilata dal paziente, statistiche
-- =====================================================================

-- ---------- dati fiscali dello studio (per le fatture) ----------
alter table public.studi add column if not exists fiscale jsonb not null default '{}'::jsonb;
update public.studi set fiscale = jsonb_build_object(
  'nome','Dott.ssa Ilaria Iacone','qualifica','Biologa Nutrizionista','indirizzo','','cap','','citta','','prov','',
  'piva','','cf','','albo','','tel','351 785 5930','email','agenda.iacone@gmail.com','iban','',
  'nota1','Operazione esente IVA ai sensi dell''art. 10, comma 1, n. 18, D.P.R. 633/1972.',
  'nota2','Operazione effettuata in regime forfettario ai sensi dell''art. 1, commi 54-89, Legge 190/2014: non soggetta a ritenuta d''acconto.')
where slug = 'ilaria-iacone' and fiscale = '{}'::jsonb;
alter table public.studi add column if not exists soglia_bollo numeric(8,2) not null default 77.47;

-- ---------- incassi: tutti i campi del foglio "Incassi" ----------
alter table public.incassi drop constraint if exists incassi_metodo_check;
update public.incassi set metodo = initcap(metodo) where metodo in ('pos','contanti','bonifico','altro');
update public.incassi set metodo = 'POS' where metodo = 'Pos';
alter table public.incassi alter column metodo set default 'POS';
alter table public.incassi add constraint incassi_metodo_check check (metodo in ('POS','Contanti','Bonifico','Satispay','Altro'));
alter table public.incassi add column if not exists nome text;          -- copia dei dati al momento del pagamento (per la fattura)
alter table public.incassi add column if not exists cf text;
alter table public.incassi add column if not exists indirizzo text;
alter table public.incassi add column if not exists cap text;
alter table public.incassi add column if not exists citta text;
alter table public.incassi add column if not exists prov text;
alter table public.incassi add column if not exists telefono text;
alter table public.incassi add column if not exists email text;
alter table public.incassi add column if not exists bollo boolean not null default false;
alter table public.incassi add column if not exists opposizione_ts boolean not null default false;
alter table public.incassi add column if not exists note text;

-- ---------- fatture numerate (n/anno) ----------
create table if not exists public.fatture (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studi(id) on delete cascade,
  numero      int  not null check (numero > 0),
  anno        int  not null,
  data        date not null,
  paziente_id uuid references public.pazienti(id) on delete set null,
  incasso_id  uuid references public.incassi(id) on delete set null,
  nome        text not null,
  cf          text, indirizzo text, cap text, citta text, prov text, email text,
  descrizione text not null default 'Prestazione professionale di consulenza nutrizionale',
  importo     numeric(10,2) not null check (importo > 0),
  bollo       numeric(6,2) not null default 0,
  metodo      text not null default 'POS',
  opposizione_ts boolean not null default false,
  inviata     timestamptz,
  creato      timestamptz not null default now(),
  unique (studio_id, anno, numero)
);
alter table public.fatture enable row level security;
drop policy if exists fatture_tutto on public.fatture;
create policy fatture_tutto on public.fatture for all to authenticated
  using (public.posso(studio_id, array['titolare','segreteria','contabile']))
  with check (public.posso(studio_id, array['titolare','segreteria','contabile']));
grant select, insert, update, delete on public.fatture to authenticated;

-- ---------- misurazioni: tutte le colonne del foglio "Misurazioni" ----------
alter table public.misurazioni add column if not exists bmi numeric(5,1);
alter table public.misurazioni add column if not exists massa_magra numeric(5,1);
alter table public.misurazioni add column if not exists massa_muscolare numeric(5,1);
alter table public.misurazioni add column if not exists acqua numeric(4,1);
alter table public.misurazioni add column if not exists grasso_viscerale numeric(4,1);
alter table public.misurazioni add column if not exists metabolismo int;

-- ---------- lista d'attesa ----------
alter table public.lista_attesa add column if not exists sede text;
alter table public.lista_attesa add column if not exists note text;

-- ---------- presenze: "arrivato" oltre a svolto/assente ----------
alter table public.appuntamenti drop constraint if exists appuntamenti_stato_check;
alter table public.appuntamenti add constraint appuntamenti_stato_check
  check (stato in ('da_confermare','confermato','annullato','svolto','assente'));
alter table public.appuntamenti add column if not exists presenza text check (presenza in ('arrivato','assente'));
-- link personale per far compilare al paziente codice fiscale e residenza
alter table public.appuntamenti add column if not exists token text unique default encode(extensions.gen_random_bytes(12),'hex');
update public.appuntamenti set token = encode(extensions.gen_random_bytes(12),'hex') where token is null;

-- ---------- scheda dati compilata dal paziente (link personale) ----------
create or replace function public.scheda_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'studio', s.nome, 'nome', z.nome,
           'quando', to_char(a.inizio at time zone s.fuso, 'DD/MM/YYYY HH24:MI'), 'sede', x.nome,
           'compilata', (z.cf is not null and z.indirizzo is not null and z.cap is not null and z.citta is not null))
  from public.appuntamenti a join public.studi s on s.id = a.studio_id
  join public.pazienti z on z.id = a.paziente_id left join public.sedi x on x.id = a.sede_id
  where a.token = p_token and length(p_token) >= 20 and a.inizio > now() - interval '60 days'
$$;

create or replace function public.scheda_salva(p_token text, p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare a public.appuntamenti%rowtype; v_cf text;
begin
  select * into a from public.appuntamenti where token = p_token and length(p_token) >= 20 and inizio > now() - interval '60 days';
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  v_cf := upper(regexp_replace(coalesce(p->>'cf',''), '\s', '', 'g'));
  if v_cf !~ '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$'
     or coalesce(trim(p->>'indirizzo'),'') = '' or coalesce(trim(p->>'cap'),'') !~ '^[0-9]{5}$'
     or coalesce(trim(p->>'citta'),'') = '' then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  update public.pazienti set cf = v_cf, indirizzo = left(trim(p->>'indirizzo'),120), cap = trim(p->>'cap'),
         citta = left(trim(p->>'citta'),60), prov = upper(left(trim(coalesce(p->>'prov','')),2))
   where id = a.paziente_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.scheda_info(text) to anon, authenticated;
grant execute on function public.scheda_salva(text, jsonb) to anon, authenticated;

-- ---------- statistiche ultimi 6 mesi ----------
create or replace function public.statistiche(p_studio uuid)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare m0 date := date_trunc('month', now() at time zone 'Europe/Rome')::date - interval '5 months';
        res jsonb;
begin
  if not public.posso(p_studio) then raise exception 'Accesso non consentito'; end if;
  with mesi as (select generate_series(m0, m0 + interval '5 months', interval '1 month')::date as m),
  app as (select date_trunc('month', inizio at time zone 'Europe/Rome')::date m, * from public.appuntamenti
          where studio_id = p_studio and stato in ('confermato','svolto','assente') and inizio >= m0
            and inizio < (m0 + interval '6 months')),
  paz as (select date_trunc('month', creato at time zone 'Europe/Rome')::date m from public.pazienti where studio_id = p_studio and creato >= m0),
  inc as (select date_trunc('month', data)::date m, importo from public.incassi where studio_id = p_studio and data >= m0)
  select jsonb_build_object(
    'mesi', (select jsonb_agg(jsonb_build_object('mese', to_char(mesi.m,'YYYY-MM'),
              'visite', (select count(*) from app where app.m = mesi.m),
              'prime', (select count(*) from app where app.m = mesi.m and app.tipo ilike '%prima%'),
              'arrivati', (select count(*) from app where app.m = mesi.m and (app.presenza = 'arrivato' or app.stato = 'svolto')),
              'assenti', (select count(*) from app where app.m = mesi.m and (app.presenza = 'assente' or app.stato = 'assente')),
              'nuovi', (select count(*) from paz where paz.m = mesi.m),
              'inc', (select coalesce(sum(importo),0) from inc where inc.m = mesi.m)) order by mesi.m) from mesi),
    'tipi', (select coalesce(jsonb_object_agg(k, n), '{}') from (select coalesce(tipo,'Altro') k, count(*) n from app
             where app.m = (m0 + interval '5 months')::date group by 1) t),
    'sedi', (select coalesce(jsonb_object_agg(k, n), '{}') from (select coalesce(x.nome,'–') k, count(*) n from app
             left join public.sedi x on x.id = app.sede_id where app.m = (m0 + interval '5 months')::date group by 1) t))
  into res;
  return res;
end $$;
grant execute on function public.statistiche(uuid) to authenticated;
