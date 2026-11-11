-- =====================================================================
-- Funzioni pubbliche usate dal sito (anche senza accesso):
--   studio_info(slug)            -> sedi, orari, prestazioni prenotabili
--   slot_liberi(slug, durata)    -> orari liberi giorno per giorno
--   prenota(slug, dati)          -> crea la richiesta "da confermare"
-- Non espongono mai nomi o dati di altri pazienti.
-- =====================================================================

create or replace function public.studio_info(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', s.nome, 'professione', s.professione, 'whatsapp', s.whatsapp,
    'giorni_avanti', s.giorni_avanti, 'passo_min', s.passo_min,
    'sedi', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome, 'struttura', x.struttura,
                       'indirizzo', x.indirizzo, 'lat', x.lat, 'lon', x.lon) order by x.ordine)
                      from public.sedi x where x.studio_id = s.id and x.attiva), '[]'),
    'orari', coalesce((select jsonb_agg(jsonb_build_object('giorno', o.giorno, 'sede_id', o.sede_id,
                       'inizio', to_char(o.inizio,'HH24:MI'), 'fine', to_char(o.fine,'HH24:MI')) order by o.giorno, o.inizio)
                      from public.orari o where o.studio_id = s.id), '[]'),
    'prestazioni', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descrizione', p.descrizione,
                       'durata', p.durata_min, 'prezzo', p.prezzo, 'famiglia', p.famiglia) order by p.ordine)
                      from public.prestazioni p where p.studio_id = s.id and p.attiva and p.online), '[]'))
  from public.studi s where s.slug = p_slug
$$;

-- orario libero? (nessun appuntamento non annullato e nessun blocco sovrapposto)
create or replace function public._libero(p_studio uuid, p_inizio timestamptz, p_fine timestamptz, p_escludi uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists(select 1 from public.appuntamenti a
                    where a.studio_id = p_studio and a.stato <> 'annullato'
                      and (p_escludi is null or a.id <> p_escludi)
                      and a.inizio < p_fine and a.fine > p_inizio)
     and not exists(select 1 from public.blocchi b
                    where b.studio_id = p_studio and b.inizio < p_fine and b.fine > p_inizio)
$$;

-- primo momento prenotabile: preavviso 0 = da domani (giorno intero), altrimenti ore di preavviso
create or replace function public._primo_prenotabile(p_studio uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select case when s.preavviso_ore = 0
              then (((now() at time zone s.fuso)::date + 1)::timestamp at time zone s.fuso)
              else now() + make_interval(hours => s.preavviso_ore) end
  from public.studi s where s.id = p_studio
$$;

create or replace function public.slot_liberi(p_slug text, p_durata int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.studi%rowtype;
  oggi date; d date; o record; t time; ini timestamptz; primo timestamptz;
  giorni jsonb := '{}'::jsonb; lista jsonb;
begin
  select * into s from public.studi where slug = p_slug;
  if not found or p_durata is null or p_durata < 5 or p_durata > 480 then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  oggi  := (now() at time zone s.fuso)::date;
  primo := public._primo_prenotabile(s.id);
  for i in 0..s.giorni_avanti loop
    d := oggi + i;
    lista := '[]'::jsonb;
    for o in select r.*, x.nome as sede from public.orari r join public.sedi x on x.id = r.sede_id
             where r.studio_id = s.id and r.giorno = extract(dow from d)::int and x.attiva
             order by r.inizio loop
      t := o.inizio;
      while t + make_interval(mins => p_durata) <= o.fine loop
        ini := (d + t) at time zone s.fuso;
        if ini >= primo and public._libero(s.id, ini, ini + make_interval(mins => p_durata)) then
          lista := lista || jsonb_build_object('ora', to_char(t, 'HH24:MI'), 'sede', o.sede, 'sede_id', o.sede_id);
        end if;
        t := t + make_interval(mins => s.passo_min);
        exit when t < o.inizio;  -- giro della mezzanotte
      end loop;
    end loop;
    giorni := giorni || jsonb_build_object(to_char(d, 'YYYY-MM-DD'), lista);
  end loop;
  return jsonb_build_object('ok', true, 'durata', p_durata, 'giorni', giorni);
end $$;

create or replace function public.prenota(p_slug text, p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.studi%rowtype; pr public.prestazioni%rowtype; sd public.sedi%rowtype;
  d date; t time; ini timestamptz; fin timestamptz; tel text; paz uuid; app uuid; ok boolean;
begin
  select * into s from public.studi where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;

  -- dati obbligatori
  if coalesce(trim(p->>'nome'),'') = '' or coalesce(trim(p->>'telefono'),'') = ''
     or coalesce((p->>'privacy')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  tel := regexp_replace(p->>'telefono', '[^0-9+]', '', 'g');
  if length(regexp_replace(tel, '[^0-9]', '', 'g')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'bad_phone');
  end if;

  -- prestazione (per id oppure per nome) e sede
  select * into pr from public.prestazioni
   where studio_id = s.id and attiva and online
     and (id::text = p->>'prestazione_id' or lower(nome) = lower(p->>'tipo')) limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  select * into sd from public.sedi
   where studio_id = s.id and attiva and (id::text = p->>'sede_id' or lower(nome) = lower(p->>'sede')) limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;

  begin
    d := (p->>'data')::date; t := (p->>'ora')::time;
  exception when others then return jsonb_build_object('ok', false, 'error', 'bad_request');
  end;
  ini := (d + t) at time zone s.fuso;
  fin := ini + make_interval(mins => pr.durata_min);

  -- un solo prenotante alla volta per studio (evita doppie prenotazioni sullo stesso orario)
  perform pg_advisory_xact_lock(hashtext(s.id::text));

  -- l'orario deve stare dentro un orario di ricevimento di quella sede, allineato al passo, ed essere libero
  select exists(select 1 from public.orari r
                where r.studio_id = s.id and r.sede_id = sd.id and r.giorno = extract(dow from d)::int
                  and t >= r.inizio and t + make_interval(mins => pr.durata_min) <= r.fine
                  and (extract(epoch from (t - r.inizio))::int / 60) % s.passo_min = 0)
    into ok;
  if not ok or d > (now() at time zone s.fuso)::date + s.giorni_avanti then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;
  if ini < public._primo_prenotabile(s.id) or not public._libero(s.id, ini, fin) then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end if;

  -- limite anti-abuso: massimo 3 richieste future in attesa per numero di telefono
  if (select count(*) from public.appuntamenti a join public.pazienti z on z.id = a.paziente_id
      where a.studio_id = s.id and z.telefono = tel and a.stato = 'da_confermare' and a.inizio > now()) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  -- paziente: lo ritrova dal telefono, altrimenti lo crea
  select id into paz from public.pazienti where studio_id = s.id and telefono = tel
   order by creato limit 1;
  if paz is null then
    insert into public.pazienti(studio_id, nome, cognome, telefono, email, cf, indirizzo, cap, citta, prov, consenso_privacy)
    values (s.id, trim(p->>'nome'), nullif(trim(p->>'cognome'),''), tel, nullif(lower(trim(p->>'email')),''),
            nullif(upper(trim(p->>'cf')),''), nullif(trim(p->>'indirizzo'),''), nullif(trim(p->>'cap'),''),
            nullif(trim(p->>'citta'),''), nullif(upper(trim(p->>'prov')),''), now())
    returning id into paz;
  else
    update public.pazienti set
      email     = coalesce(email, nullif(lower(trim(p->>'email')),'')),
      cf        = coalesce(cf, nullif(upper(trim(p->>'cf')),'')),
      indirizzo = coalesce(indirizzo, nullif(trim(p->>'indirizzo'),'')),
      cap       = coalesce(cap, nullif(trim(p->>'cap'),'')),
      citta     = coalesce(citta, nullif(trim(p->>'citta'),'')),
      prov      = coalesce(prov, nullif(upper(trim(p->>'prov')),'')),
      consenso_privacy = coalesce(consenso_privacy, now())
    where id = paz;
  end if;

  insert into public.appuntamenti(studio_id, paziente_id, sede_id, prestazione_id, tipo, inizio, fine, stato, origine, note)
  values (s.id, paz, sd.id, pr.id, pr.nome, ini, fin, 'da_confermare', 'sito', nullif(left(trim(p->>'note'), 1000),''))
  returning id into app;

  return jsonb_build_object('ok', true, 'id', app);
end $$;

revoke all on function public._libero(uuid, timestamptz, timestamptz, uuid) from public, anon;
revoke all on function public._primo_prenotabile(uuid) from public, anon;
grant execute on function public._libero(uuid, timestamptz, timestamptz, uuid) to authenticated;
grant execute on function public.studio_info(text) to anon, authenticated;
grant execute on function public.slot_liberi(text, int) to anon, authenticated;
grant execute on function public.prenota(text, jsonb) to anon, authenticated;
