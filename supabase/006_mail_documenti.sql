-- =====================================================================
-- 006 — mail con PDF allegato: report delle misurazioni e fattura
-- =====================================================================

alter table public.email_log drop constraint if exists email_log_tipo_check;
alter table public.email_log add constraint email_log_tipo_check
  check (tipo in ('ricevuta','confermato','spostato','annullato','promemoria','scheda','misure','fattura'));
alter table public.email_log add column if not exists rif uuid;   -- paziente (misure) o fattura

-- prepara la mail di un documento: solo chi lavora nello studio
-- p_tipo: misure (p_id = paziente) | fattura (p_id = fattura)
create or replace function public.mail_documento(p_tipo text, p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_studio uuid; v_nome text; v_email text; v_titolo text; s public.studi%rowtype; lid uuid; lk text;
begin
  if p_tipo = 'misure' then
    select z.studio_id, z.nome, z.email into v_studio, v_nome, v_email from public.pazienti z where z.id = p_id;
    v_titolo := 'Le tue misurazioni';
  elsif p_tipo = 'fattura' then
    select f.studio_id, coalesce(z.nome, split_part(f.nome, ' ', 1)), coalesce(nullif(trim(f.email), ''), z.email),
           'Fattura n. ' || f.numero || '/' || f.anno
      into v_studio, v_nome, v_email, v_titolo
      from public.fatture f left join public.pazienti z on z.id = f.paziente_id where f.id = p_id;
  else
    return jsonb_build_object('ok', false, 'error', 'tipo');
  end if;
  if v_studio is null or not public.posso(v_studio) then return jsonb_build_object('ok', false, 'error', 'non_autorizzato'); end if;
  if coalesce(trim(v_email), '') = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'manca_email');
  end if;
  if exists (select 1 from public.email_log where rif = p_id and tipo = p_tipo and esito <> 'errore' and creato > now() - interval '1 minute') then
    return jsonb_build_object('ok', false, 'error', 'appena_inviata');
  end if;
  select * into s from public.studi where id = v_studio;
  insert into public.email_log(studio_id, tipo, a, rif) values (v_studio, p_tipo, lower(trim(v_email)), p_id) returning id, chiave into lid, lk;
  return jsonb_build_object('ok', true, 'mail', jsonb_build_object(
    'log', lid, 'chiave', lk, 'tipo', p_tipo, 'a', lower(trim(v_email)), 'nome', v_nome, 'titolo', v_titolo,
    'studio', s.nome, 'reply_to', s.email, 'whatsapp', s.whatsapp));
end $$;
revoke all on function public.mail_documento(text, uuid) from public;
grant execute on function public.mail_documento(text, uuid) to authenticated;

-- esito: per le fatture segna anche "inviata"
create or replace function public.mail_esito(p_log uuid, p_chiave text, p_ok boolean, p_resend text default null, p_errore text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare l public.email_log%rowtype;
begin
  update public.email_log set esito = case when p_ok then 'inviata' else 'errore' end,
         resend_id = left(p_resend, 80), errore = left(p_errore, 500)
   where id = p_log and chiave = p_chiave and esito = 'in_invio' returning * into l;
  if found and p_ok and l.tipo = 'fattura' then
    update public.fatture set inviata = now() where id = l.rif;
  end if;
end $$;
revoke all on function public.mail_esito(uuid, text, boolean, text, text) from public;
grant execute on function public.mail_esito(uuid, text, boolean, text, text) to anon, authenticated;
