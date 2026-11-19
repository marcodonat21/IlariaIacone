-- 009 — protocollo del Sistema Tessera Sanitaria (da inserire prima di mandare la fattura)
alter table public.fatture add column if not exists protocollo_ts text;
alter table public.incassi add column if not exists protocollo_ts text;
