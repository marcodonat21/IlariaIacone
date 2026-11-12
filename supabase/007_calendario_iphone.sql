-- =====================================================================
-- 007 — calendario in abbonamento (iPhone / Mac / Google): solo lettura
-- Il link contiene un codice segreto; si può rigenerare dall'agenda.
-- =====================================================================
alter table public.studi add column if not exists cal_token text unique;

-- appuntamenti e blocchi per il link del calendario (chi ha il codice)
create or replace function public.calendario_eventi(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', true, 'nome', s.nome, 'fuso', s.fuso,
    'eventi', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'inizio', a.inizio, 'fine', a.fine, 'stato', a.stato, 'tipo', a.tipo,
        'paziente', trim(concat_ws(' ', z.nome, z.cognome)), 'telefono', z.telefono,
        'sede', x.nome, 'indirizzo', concat_ws(', ', nullif(x.struttura,''), nullif(x.indirizzo,'')),
        'note', a.note, 'agg', a.creato) order by a.inizio)
      from public.appuntamenti a join public.pazienti z on z.id = a.paziente_id
      left join public.sedi x on x.id = a.sede_id
      where a.studio_id = s.id and a.stato <> 'annullato'
        and a.inizio > now() - interval '60 days' and a.inizio < now() + interval '400 days'), '[]'::jsonb),
    'blocchi', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'inizio', b.inizio, 'fine', b.fine, 'motivo', b.motivo) order by b.inizio)
      from public.blocchi b where b.studio_id = s.id
        and b.fine > now() - interval '60 days' and b.inizio < now() + interval '400 days'), '[]'::jsonb))
  from public.studi s where s.cal_token = p_token and length(p_token) >= 32
$$;
revoke all on function public.calendario_eventi(text) from public;
grant execute on function public.calendario_eventi(text) to anon, authenticated;

-- il link (solo la titolare): lo crea se manca, lo cambia se p_nuovo
create or replace function public.calendario_link(p_studio uuid, p_nuovo boolean default false)
returns text language plpgsql volatile security definer set search_path = public as $$
declare t text;
begin
  if not public.posso(p_studio, array['titolare']) then raise exception 'Solo la titolare può gestire il calendario'; end if;
  select cal_token into t from public.studi where id = p_studio;
  if t is null or p_nuovo then
    t := encode(extensions.gen_random_bytes(24), 'hex');
    update public.studi set cal_token = t where id = p_studio;
  end if;
  return t;
end $$;
revoke all on function public.calendario_link(uuid, boolean) from public;
grant execute on function public.calendario_link(uuid, boolean) to authenticated;
