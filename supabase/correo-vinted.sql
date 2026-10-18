-- Libro de Reventa · buzón de correos de Vinted
-- Pégalo entero en Supabase > SQL Editor > New query > Run (una sola vez).
-- Crea una «llave» para el lector de Gmail: con ella solo puede DEJAR correos en tu buzón de la app,
-- no puede leer ni cambiar nada más. Al final te enseña la llave para pegarla en el lector.

create table if not exists public.mail_keys (
  key     text primary key,
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table public.mail_keys enable row level security;   -- sin políticas: nadie la lee desde fuera

create or replace function public.ingest_mail(p_key text, p_mail jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select user_id into uid from public.mail_keys where key = p_key;
  if uid is null then raise exception 'llave no válida'; end if;
  if coalesce(p_mail->>'id', '') = '' then raise exception 'falta el id'; end if;
  insert into public.docs (coll, id, data, user_id)
  values ('mailin', 'm' || (p_mail->>'id'), (p_mail - 'id') || jsonb_build_object('mailId', p_mail->>'id', 'createdAt', (extract(epoch from now()) * 1000)::bigint), uid)
  on conflict (coll, id) do nothing;
  return 'ok';
end $$;
revoke all on function public.ingest_mail(text, jsonb) from public;
grant execute on function public.ingest_mail(text, jsonb) to anon, authenticated;

-- La llave, para el correo con el que entras en la app (cámbialo aquí si entras con otro):
insert into public.mail_keys (key, user_id)
select replace(gen_random_uuid()::text, '-', ''), id from auth.users where email = 'guillem7878@gmail.com' or (select count(*) from auth.users) = 1 limit 1
on conflict do nothing;

select key as "Copia esta llave en el lector" from public.mail_keys;
