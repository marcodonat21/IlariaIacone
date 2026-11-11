-- =====================================================================
-- Primo studio: Ilaria Iacone (dati di configurazione, nessun paziente)
-- =====================================================================
do $$
declare st uuid; v uuid; p uuid; n uuid;
begin
  insert into public.studi(slug, nome, professione, email, whatsapp, sito, giorni_avanti, preavviso_ore, passo_min)
  values ('ilaria-iacone', 'Ilaria Iacone', 'Biologa Nutrizionista', 'agenda.iacone@gmail.com', '351 785 5930',
          'https://www.nutrizionistaiacone.it', 21, 0, 30)
  on conflict (slug) do nothing;
  select id into st from public.studi where slug = 'ilaria-iacone';
  if exists(select 1 from public.sedi where studio_id = st) then return; end if;

  insert into public.sedi(studio_id, nome, struttura, indirizzo, lat, lon, ordine) values
    (st, 'Portici', 'Studio Medico Secondulfo', 'Corso Giuseppe Garibaldi 41, Portici', 40.8140764, 14.3369589, 1) returning id into p;
  insert into public.sedi(studio_id, nome, struttura, indirizzo, lat, lon, ordine) values
    (st, 'Volla', 'Movement & Performance', 'Viale Vesuvio 138, Volla', 40.8746595, 14.341598, 2) returning id into v;
  insert into public.sedi(studio_id, nome, struttura, indirizzo, lat, lon, ordine) values
    (st, 'Napoli', 'Full Face Academy', 'Via Agostino Depretis 114, Napoli', 40.8406867, 14.2537981, 3) returning id into n;

  -- giorni e orari di ricevimento (0 = domenica)
  insert into public.orari(studio_id, giorno, sede_id, inizio, fine) values
    (st, 1, v, '09:00', '12:00'), (st, 1, v, '14:00', '19:30'),
    (st, 2, p, '14:00', '20:00'),
    (st, 3, v, '09:00', '12:00'), (st, 3, v, '14:00', '19:30'),
    (st, 4, n, '15:00', '19:00'),
    (st, 5, p, '09:00', '18:00'),
    (st, 6, v, '09:00', '12:30');

  -- prestazioni e durate come su MioDottore
  insert into public.prestazioni(studio_id, nome, descrizione, durata_min, prezzo, famiglia, ordine) values
    (st, 'Prima visita nutrizionale',               'Anamnesi, misure, bioimpedenziometria e piano alimentare', 60,  85, 't1', 1),
    (st, 'Prima visita nutrizionale + adipometria', 'La prima visita completa, con l''adipometria',           90, 100, 't1', 2),
    (st, 'Prima visita nutrizione sportiva',        'Per chi fa sport, con valutazione ISAK',                 90, 100, 't3', 3),
    (st, 'Prima visita sportiva + adipometria',     'Nutrizione sportiva con ISAK e adipometria',            100, 120, 't3', 4),
    (st, 'Visita di controllo',                     'Progressi e aggiustamenti del piano',                    30,  40, 't2', 5),
    (st, 'Visita di controllo + adipometria',       'Il controllo con la misura del grasso',                  40,  60, 't2', 6),
    (st, 'Visita di controllo + ISAK',              'Il controllo con le misure ISAK',                        40,  60, 't2', 7),
    (st, 'Adipometria',                             'Spessore di grasso e muscolo con l''ecografia',          30,  40, 't4', 8),
    (st, 'Esame bioimpedenziometrico',              'Composizione corporea, semplice e non invasivo',         30,  40, 't4', 9);
end $$;
