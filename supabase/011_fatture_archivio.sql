-- 011 — scansione firmata della fattura (con marca da bollo) conservata per l'archivio
alter table public.fatture add column if not exists scansione text;   -- percorso nel bucket "fatture": <studio_id>/<fattura_id>.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('fatture','fatture',false, 10485760, array['application/pdf']) on conflict (id) do nothing;
drop policy if exists fatture_file_leggi on storage.objects;
drop policy if exists fatture_file_scrivi on storage.objects;
drop policy if exists fatture_file_aggiorna on storage.objects;
create policy fatture_file_leggi on storage.objects for select to authenticated using (bucket_id = 'fatture' and public.posso(((storage.foldername(name))[1])::uuid));
create policy fatture_file_scrivi on storage.objects for insert to authenticated with check (bucket_id = 'fatture' and public.posso(((storage.foldername(name))[1])::uuid));
create policy fatture_file_aggiorna on storage.objects for update to authenticated using (bucket_id = 'fatture' and public.posso(((storage.foldername(name))[1])::uuid));
