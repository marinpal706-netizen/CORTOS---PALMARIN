-- ==========================================
-- PLMRN · Valoraciones con estrellas + cuentas de usuario (Supabase)
-- ==========================================
-- CÓMO INSTALARLO: sigue los pasos de supabase/README.md
-- (resumen: SQL Editor → New query → pega TODO este archivo → Run).
-- Puedes volver a ejecutar este archivo sin perder los votos.
--
-- Cada usuario registrado tiene UN voto por corto y puede cambiarlo cuando quiera.

-- ---------- Tablas ----------

-- Votos: uno por (corto, usuario). user_id es el usuario de Supabase Auth.
create table if not exists public.film_user_votes (
    film_slug  text        not null check (film_slug ~ '^[a-z0-9-]{1,80}$'),
    user_id    uuid        not null references auth.users (id) on delete cascade,
    score      smallint    not null check (score between 1 and 5),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (film_slug, user_id)
);

-- Totales por corto: suma de puntuaciones y número de votos.
-- Se mantienen solos con el trigger de más abajo.
create table if not exists public.film_ratings (
    film_slug   text primary key,
    total_score bigint  not null default 0 check (total_score >= 0),
    vote_count  integer not null default 0 check (vote_count >= 0)
);

-- ---------- Seguridad (Row Level Security) ----------
-- · Cualquiera puede LEER los totales.
-- · Cada usuario solo puede LEER su propio voto.
-- · Nadie escribe directamente: los votos entran solo por submit_rating().

alter table public.film_user_votes enable row level security;
alter table public.film_ratings    enable row level security;

drop policy if exists "Totales visibles para todos" on public.film_ratings;
create policy "Totales visibles para todos" on public.film_ratings
    for select using (true);

drop policy if exists "Cada usuario ve su propio voto" on public.film_user_votes;
create policy "Cada usuario ve su propio voto" on public.film_user_votes
    for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.film_ratings    from anon, authenticated;
revoke all on public.film_user_votes from anon, authenticated;
grant select on public.film_ratings    to anon, authenticated;
grant select on public.film_user_votes to authenticated;

-- ---------- Totales automáticos ----------

create or replace function public.update_film_rating_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op in ('UPDATE', 'DELETE') then
        update public.film_ratings
           set total_score = total_score - old.score,
               vote_count  = vote_count - 1
         where film_slug = old.film_slug;
    end if;

    if tg_op in ('INSERT', 'UPDATE') then
        insert into public.film_ratings as r (film_slug, total_score, vote_count)
        values (new.film_slug, new.score, 1)
        on conflict (film_slug) do update
            set total_score = r.total_score + excluded.total_score,
                vote_count  = r.vote_count + 1;
    end if;

    return null;
end;
$$;

drop trigger if exists film_user_votes_totals on public.film_user_votes;
create trigger film_user_votes_totals
    after insert or update of score or delete on public.film_user_votes
    for each row execute function public.update_film_rating_totals();

-- Recalcula los totales desde cero (deja todo coherente al reinstalar).
-- Nota: los votos anónimos de la versión anterior (tabla film_votes) ya no cuentan.
insert into public.film_ratings (film_slug, total_score, vote_count)
select film_slug, sum(score), count(*) from public.film_user_votes group by film_slug
on conflict (film_slug) do update
    set total_score = excluded.total_score,
        vote_count  = excluded.vote_count;
delete from public.film_ratings r
 where not exists (select 1 from public.film_user_votes v where v.film_slug = r.film_slug);

-- ---------- Media calculada en el servidor ----------

create or replace view public.film_rating_summary
with (security_invoker = on) as
select
    film_slug,
    round(total_score::numeric / nullif(vote_count, 0), 2) as average,
    vote_count
from public.film_ratings
where vote_count > 0;

grant select on public.film_rating_summary to anon, authenticated;

-- ---------- Endpoint de voto: POST /rest/v1/rpc/submit_rating ----------
-- Requiere sesión iniciada. Crea o actualiza el voto del usuario y
-- devuelve la nueva media:
--   { status: "created" | "updated" | "unchanged", your_score, average, votes }

drop function if exists public.submit_rating(text, uuid, integer);  -- versión anónima anterior

create or replace function public.submit_rating(p_film text, p_score integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user     uuid := auth.uid();
    v_previous smallint;
    v_status   text;
    v_total    bigint;
    v_count    integer;
begin
    if v_user is null then
        raise exception 'Debes iniciar sesión para valorar' using errcode = '28000';
    end if;
    if p_score is null or p_score < 1 or p_score > 5 then
        raise exception 'La puntuación debe estar entre 1 y 5' using errcode = '22023';
    end if;
    if p_film is null or p_film !~ '^[a-z0-9-]{1,80}$' then
        raise exception 'Identificador de corto no válido' using errcode = '22023';
    end if;

    select score into v_previous
      from public.film_user_votes
     where film_slug = p_film and user_id = v_user
       for update;

    if v_previous is null then
        insert into public.film_user_votes (film_slug, user_id, score)
        values (p_film, v_user, p_score);
        v_status := 'created';
    elsif v_previous <> p_score then
        update public.film_user_votes
           set score = p_score, updated_at = now()
         where film_slug = p_film and user_id = v_user;
        v_status := 'updated';
    else
        v_status := 'unchanged';
    end if;

    select total_score, vote_count into v_total, v_count
      from public.film_ratings
     where film_slug = p_film;

    return json_build_object(
        'status',     v_status,
        'your_score', p_score,
        'average',    round(v_total::numeric / nullif(v_count, 0), 2),
        'votes',      coalesce(v_count, 0)
    );
end;
$$;

revoke all on function public.submit_rating(text, integer) from public, anon;
grant execute on function public.submit_rating(text, integer) to authenticated;

revoke all on function public.update_film_rating_totals() from public, anon, authenticated;

-- ==========================================
-- Perfiles: nombre de usuario público
-- ==========================================
-- Las cuentas se crean con usuario + contraseña. Supabase necesita un email
-- por dentro, así que la web usa uno interno (usuario@usuarios.plmrn.invalid)
-- que nunca recibe correos. El nombre visible se guarda aquí.

create table if not exists public.profiles (
    id         uuid        primary key references auth.users (id) on delete cascade,
    username   text        not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
    created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Nombres de usuario visibles para todos" on public.profiles;
create policy "Nombres de usuario visibles para todos" on public.profiles
    for select using (true);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

-- Crea el perfil automáticamente al registrarse (el nombre llega en los metadatos).
-- Cuentas sin nombre (p. ej. creadas antes con email) reciben uno automático.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_username text := new.raw_user_meta_data ->> 'username';
begin
    if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,20}$' then
        v_username := left(regexp_replace(coalesce(split_part(new.email, '@', 1), 'usuario'), '[^A-Za-z0-9_]', '_', 'g'), 15)
                      || '_' || left(replace(new.id::text, '-', ''), 4);
    end if;

    insert into public.profiles (id, username) values (new.id, v_username);
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Perfil para las cuentas que ya existían antes de este cambio.
insert into public.profiles (id, username)
select u.id,
       left(regexp_replace(coalesce(split_part(u.email, '@', 1), 'usuario'), '[^A-Za-z0-9_]', '_', 'g'), 15)
       || '_' || left(replace(u.id::text, '-', ''), 4)
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- ¿Está libre este nombre de usuario? (para avisar antes de registrarse)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ==========================================
-- Comentarios
-- ==========================================
-- Cualquiera puede leerlos; para escribir hay que iniciar sesión.
-- Cada usuario puede borrar los suyos. Tú puedes borrar cualquiera desde
-- Table Editor → film_comments.

create table if not exists public.film_comments (
    id         bigint      generated always as identity primary key,
    film_slug  text        not null check (film_slug ~ '^[a-z0-9-]{1,80}$'),
    user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
    body       text        not null check (char_length(btrim(body)) between 1 and 1000),
    score      smallint    check (score between 1 and 5),  -- valoración del autor al comentar
    created_at timestamptz not null default now()
);

-- Para proyectos donde la tabla ya existía sin la columna de puntuación.
alter table public.film_comments add column if not exists score smallint check (score between 1 and 5);

create index if not exists film_comments_film_created_idx on public.film_comments (film_slug, created_at desc);
create index if not exists film_comments_user_created_idx on public.film_comments (user_id, created_at desc);

alter table public.film_comments enable row level security;

drop policy if exists "Comentarios visibles para todos" on public.film_comments;
create policy "Comentarios visibles para todos" on public.film_comments
    for select using (true);

drop policy if exists "Usuarios publican con su cuenta" on public.film_comments;
create policy "Usuarios publican con su cuenta" on public.film_comments
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Usuarios borran sus comentarios" on public.film_comments;
create policy "Usuarios borran sus comentarios" on public.film_comments
    for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.film_comments from anon, authenticated;
grant select on public.film_comments to anon, authenticated;
grant insert (film_slug, body) on public.film_comments to authenticated;
grant delete on public.film_comments to authenticated;

-- Al publicar: antispam (como mucho un comentario cada 15 segundos por usuario)
-- y se guarda la valoración que el autor tiene en ese momento para el corto.
create or replace function public.limit_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if exists (
        select 1 from public.film_comments
         where user_id = new.user_id
           and created_at > now() - interval '15 seconds'
    ) then
        raise exception 'comment_rate_limit' using errcode = 'P0001';
    end if;
    new.body := btrim(new.body);
    new.score := (
        select v.score from public.film_user_votes v
         where v.film_slug = new.film_slug and v.user_id = new.user_id
    );
    return new;
end;
$$;

drop trigger if exists film_comments_rate_limit on public.film_comments;
create trigger film_comments_rate_limit
    before insert on public.film_comments
    for each row execute function public.limit_comment_rate();

revoke all on function public.limit_comment_rate() from public, anon, authenticated;

-- Comentarios publicados antes de existir la columna: se rellenan con el voto actual.
update public.film_comments c
   set score = v.score
  from public.film_user_votes v
 where c.score is null and v.film_slug = c.film_slug and v.user_id = c.user_id;

-- ---------- Limpieza opcional ----------
-- La tabla de votos anónimos de la versión anterior ya no se usa.
-- Si la creaste y quieres borrarla, quita los dos guiones de la línea siguiente:
-- drop table if exists public.film_votes;
