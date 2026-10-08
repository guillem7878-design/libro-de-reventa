-- Libro de Reventa · esquema de Supabase
-- Pégalo entero en Supabase > SQL Editor > New query > Run.

-- Una sola tabla genérica: cada documento de la app (venta, producto, gasto...) es una fila.
create table if not exists public.docs (
  coll        text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists docs_user_coll on public.docs (user_id, coll);

-- Cada usuario solo ve y toca sus propias filas.
alter table public.docs enable row level security;
drop policy if exists docs_owner on public.docs;
create policy docs_owner on public.docs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Actualización parcial atómica (dos dispositivos pueden editar a la vez sin pisarse los campos).
create or replace function public.merge_doc(p_coll text, p_id text, p_patch jsonb)
returns void language sql security invoker as $$
  update public.docs
     set data = data || p_patch, updated_at = now()
   where coll = p_coll and id = p_id;
$$;

-- Tiempo real: los cambios de un dispositivo llegan al otro al instante.
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- Fotos de productos. El nombre del archivo es un identificador aleatorio.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
