-- 008 — in quale studio è stato fatto l'incasso (per la riga del file Excel delle fatture)
alter table public.incassi add column if not exists sede text;   -- nome della sede (es. "Portici") oppure "Online"
