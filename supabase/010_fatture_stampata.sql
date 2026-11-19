-- 010 — fattura con bollo: quando è stato scaricato il PDF da stampare
alter table public.fatture add column if not exists stampata timestamptz;
