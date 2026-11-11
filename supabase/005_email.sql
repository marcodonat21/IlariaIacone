-- =====================================================================
-- 005 — mail ai pazienti (con Resend, dalla funzione "mail")
-- ricevuta (prenotazione dal sito), confermato, spostato, annullato,
-- promemoria del giorno prima (automatico ogni ora), scheda dati fattura
-- =====================================================================

create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studi(id) on delete cascade,
  appuntamento_id uuid references public.appuntamenti(id) on delete set null,
  tipo            text not null check (tipo in ('ricevuta','confermato','spostato','annullato','promemoria','scheda')),
  a               text not null,
  inizio          timestamptz,               -- orario dell'appuntamento al momento dell'invio
  esito           text not null default 'in_invio' check (esito in ('in_invio','inviata','errore')),
  errore          text,
  resend_id       text,
  chiave          text not null default encode(extensions.gen_random_bytes(16),'hex'),
  creato          timestamptz not null default now()
);
create index if not exists email_log_app on public.email_log(appuntamento_id, tipo);
alter table public.email_log enable row level security;
drop policy if exists email_log_leggi on public.email_log;
create policy email_log_leggi on public.email_log for select to authenticated using (public.posso(studio_id));
grant select on public.email_log to authenticated;

-- data in italiano: "sabato 14 novembre alle 11:30"
create or replace function public._quando_it(t timestamptz, fuso text)
returns text language sql immutable set search_path = public as $$
  select (array['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'])[extract(dow from t at time zone fuso)::int + 1]
      || ' ' || extract(day from t at time zone fuso)::int || ' '
      || (array['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'])[extract(month from t at time zone fuso)::int]
      || ' alle ' || to_char(t at time zone fuso, 'HH24:MI')
$$;

-- segreto per il promemoria automatico (lo conosce solo il database)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'mail_cron') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24),'hex'), 'mail_cron');
  end if;
end $$;

-- prepara le mail da mandare e le segna "in invio" (così non partono due volte)
-- p_tipo: ricevuta | confermato | spostato | annullato | scheda  (con p_id)
--         promemoria (con p_id = una sola, oppure senza p_id + p_cron = tutte quelle di domani)
create or replace function public.mail_prepara(p_tipo text, p_id uuid default null, p_prima text default null, p_cron text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r record; out jsonb := '[]'::jsonb; lid uuid; lk text; ok boolean;
begin
  if p_tipo not in ('ricevuta','confermato','spostato','annullato','promemoria','scheda') then
    return jsonb_build_object('ok', false, 'error', 'tipo');
  end if;
  if p_tipo = 'promemoria' and p_id is null then
    if p_cron is null or p_cron is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'mail_cron') then
      return jsonb_build_object('ok', false, 'error', 'non_autorizzato');
    end if;
  end if;

  for r in
    select a.id, a.studio_id, a.inizio, a.tipo, a.stato, a.origine, a.creato, a.token,
           z.nome, z.email, (z.cf is not null and z.indirizzo is not null and z.cap is not null and z.citta is not null) as dati_ok,
           s.nome as studio, s.email as studio_email, s.whatsapp, s.sito, s.fuso,
           x.nome as sede, x.struttura, x.indirizzo
    from public.appuntamenti a
    join public.pazienti z on z.id = a.paziente_id
    join public.studi s on s.id = a.studio_id
    left join public.sedi x on x.id = a.sede_id
    where (p_id is not null and a.id = p_id)
       or (p_id is null and p_tipo = 'promemoria'
           and a.stato = 'confermato'
           and (a.inizio at time zone s.fuso)::date = ((now() at time zone s.fuso)::date + 1)
           and extract(hour from now() at time zone s.fuso) >= 18)   -- parte dalle 18 del giorno prima
  loop
    -- chi può chiederla
    if p_tipo = 'ricevuta' then
      ok := r.origine = 'sito' and r.creato > now() - interval '15 minutes';
    elsif p_tipo = 'promemoria' and p_id is null then
      ok := true;
    else
      ok := public.posso(r.studio_id);
    end if;
    continue when not ok;
    continue when coalesce(trim(r.email),'') = '' or r.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
    continue when p_tipo <> 'annullato' and r.stato = 'annullato';
    continue when r.inizio < now() and p_tipo <> 'annullato';
    -- niente doppioni: ricevuta una volta sola, promemoria una volta per orario
    continue when p_tipo in ('ricevuta','promemoria') and exists (
      select 1 from public.email_log l where l.appuntamento_id = r.id and l.tipo = p_tipo
        and l.esito <> 'errore' and (p_tipo = 'ricevuta' or l.inizio = r.inizio));
    -- e niente invii a raffica dello stesso tipo
    continue when exists (select 1 from public.email_log l where l.appuntamento_id = r.id and l.tipo = p_tipo
        and l.esito <> 'errore' and l.creato > now() - interval '1 minute');

    insert into public.email_log(studio_id, appuntamento_id, tipo, a, inizio)
      values (r.studio_id, r.id, p_tipo, lower(trim(r.email)), r.inizio) returning id, chiave into lid, lk;
    out := out || jsonb_build_object(
      'log', lid, 'chiave', lk, 'tipo', p_tipo, 'a', lower(trim(r.email)), 'nome', r.nome,
      'visita', coalesce(r.tipo, 'Visita'), 'quando', public._quando_it(r.inizio, r.fuso),
      'dove', coalesce(nullif(concat_ws(', ', nullif(r.struttura,''), nullif(r.indirizzo,'')), ''), r.sede, ''),
      'prima', p_prima, 'studio', r.studio, 'reply_to', r.studio_email, 'whatsapp', r.whatsapp, 'sito', r.sito,
      'scheda', case when (p_tipo in ('confermato','scheda') and not r.dati_ok) or p_tipo = 'scheda'
                     then 'https://agenda-supabase.ilariaiacone.pages.dev/agenda/scheda.html?t=' || r.token end);
  end loop;
  return jsonb_build_object('ok', true, 'mail', out);
end $$;
revoke all on function public.mail_prepara(text, uuid, text, text) from public;
grant execute on function public.mail_prepara(text, uuid, text, text) to anon, authenticated;

-- esito dell'invio (serve la chiave restituita da mail_prepara)
create or replace function public.mail_esito(p_log uuid, p_chiave text, p_ok boolean, p_resend text default null, p_errore text default null)
returns void language sql volatile security definer set search_path = public as $$
  update public.email_log set esito = case when p_ok then 'inviata' else 'errore' end,
         resend_id = left(p_resend, 80), errore = left(p_errore, 500)
   where id = p_log and chiave = p_chiave and esito = 'in_invio'
$$;
revoke all on function public.mail_esito(uuid, text, boolean, text, text) from public;
grant execute on function public.mail_esito(uuid, text, boolean, text, text) to anon, authenticated;

-- promemoria automatico: ogni ora chiama la funzione "mail" (dalle 18 manda quelli di domani)
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.unschedule('mail-promemoria') where exists (select 1 from cron.job where jobname = 'mail-promemoria');
select cron.schedule('mail-promemoria', '5 * * * *', $$
  select net.http_post(
    url := 'https://afdpxhzxhfeumtjtfvui.supabase.co/functions/v1/mail',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('tipo', 'promemoria',
              'cron', (select decrypted_secret from vault.decrypted_secrets where name = 'mail_cron')),
    timeout_milliseconds := 20000)
$$);
