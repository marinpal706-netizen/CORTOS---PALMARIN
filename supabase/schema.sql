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

-- Respuestas: parent_id apunta al comentario principal (un solo nivel).
-- Si se borra el comentario principal, se borran también sus respuestas.
alter table public.film_comments add column if not exists parent_id bigint references public.film_comments (id) on delete cascade;
-- Número de "me gusta" (se mantiene solo con el trigger de comment_likes).
alter table public.film_comments add column if not exists like_count integer not null default 0 check (like_count >= 0);

create index if not exists film_comments_film_created_idx on public.film_comments (film_slug, created_at desc);
create index if not exists film_comments_user_created_idx on public.film_comments (user_id, created_at desc);
create index if not exists film_comments_parent_idx on public.film_comments (parent_id, created_at);

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
grant insert (film_slug, body, parent_id) on public.film_comments to authenticated;
grant delete on public.film_comments to authenticated;

-- Al publicar: antispam (como mucho un comentario cada 15 segundos por usuario)
-- y se guarda la valoración que el autor tiene en ese momento para el corto.
-- Las respuestas deben ser del mismo corto; si se responde a una respuesta,
-- se cuelga del comentario principal (solo hay un nivel).
create or replace function public.limit_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_parent_film   text;
    v_parent_parent bigint;
begin
    if new.parent_id is not null then
        select film_slug, parent_id into v_parent_film, v_parent_parent
          from public.film_comments
         where id = new.parent_id;
        if not found or v_parent_film <> new.film_slug then
            raise exception 'invalid_parent' using errcode = '22023';
        end if;
        new.parent_id := coalesce(v_parent_parent, new.parent_id);
    end if;
    new.like_count := 0;

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

-- ==========================================
-- "Me gusta" en comentarios
-- ==========================================
-- Un "me gusta" por (comentario, usuario). Cada usuario solo ve y borra los suyos;
-- el total público está en film_comments.like_count.

create table if not exists public.comment_likes (
    comment_id bigint      not null references public.film_comments (id) on delete cascade,
    user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_idx on public.comment_likes (user_id);

alter table public.comment_likes enable row level security;

drop policy if exists "Cada usuario ve sus me gusta" on public.comment_likes;
create policy "Cada usuario ve sus me gusta" on public.comment_likes
    for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Cada usuario da sus me gusta" on public.comment_likes;
create policy "Cada usuario da sus me gusta" on public.comment_likes
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuario quita sus me gusta" on public.comment_likes;
create policy "Cada usuario quita sus me gusta" on public.comment_likes
    for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.comment_likes from anon, authenticated;
grant select, delete on public.comment_likes to authenticated;
grant insert (comment_id) on public.comment_likes to authenticated;

create or replace function public.update_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        update public.film_comments set like_count = like_count + 1 where id = new.comment_id;
    else
        update public.film_comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    end if;
    return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
    after insert or delete on public.comment_likes
    for each row execute function public.update_comment_like_count();

revoke all on function public.update_comment_like_count() from public, anon, authenticated;

-- Recalcula los totales (deja todo coherente al reinstalar).
update public.film_comments c
   set like_count = (select count(*) from public.comment_likes l where l.comment_id = c.id)
 where like_count <> (select count(*) from public.comment_likes l where l.comment_id = c.id);

-- ==========================================
-- Catálogo de cortos + panel de administración (admin.html)
-- ==========================================
-- Los cortos se guardan aquí en lugar de en js/data.js. data.js se queda como
-- copia de seguridad: la web la usa si Supabase no responde.
-- · Cualquiera puede LEER los cortos publicados.
-- · Solo los administradores (tabla admins) pueden crear, editar, ocultar o borrar.

-- Administradores. Nadie puede leer ni tocar esta tabla desde la web:
-- se añaden a mano desde el SQL Editor (ver supabase/README.md).
create table if not exists public.admins (
    user_id    uuid        primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- ¿El usuario con la sesión actual es administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.shorts (
    slug       text        primary key check (slug ~ '^[a-z0-9-]{1,80}$'),
    title      text        not null check (char_length(btrim(title)) between 1 and 120),
    year       smallint    check (year between 1900 and 2100),
    genre      text        not null default '' check (char_length(genre) <= 120),
    -- Imágenes: ruta de la carpeta img/ o enlace https (p. ej. Supabase Storage).
    thumbnail  text        not null default '' check (thumbnail ~ '^(|img/[A-Za-z0-9._/-]{1,200}|https://[A-Za-z0-9._~:/?#@!$&*+,;=%-]{1,500})$'),
    poster     text        not null default '' check (poster    ~ '^(|img/[A-Za-z0-9._/-]{1,200}|https://[A-Za-z0-9._~:/?#@!$&*+,;=%-]{1,500})$'),
    -- Vídeos: enlaces de YouTube (o vacío).
    trailer    text        not null default '' check (trailer   ~ '^(|https://[A-Za-z0-9._~:/?#@!$&*+,;=%-]{1,500})$'),
    movie      text        not null default '' check (movie     ~ '^(|https://[A-Za-z0-9._~:/?#@!$&*+,;=%-]{1,500})$'),
    synopsis   text        not null default '' check (char_length(synopsis) <= 2000),
    -- Festivales: [{ "type": "Finalista", "name": "HorrorHound Festival" }, ...]
    laurels    jsonb       not null default '[]' check (jsonb_typeof(laurels) = 'array' and jsonb_array_length(laurels) <= 30),
    -- Orden en la web: el número más bajo sale primero.
    position   integer     not null default 0,
    published  boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists shorts_position_idx on public.shorts (position, created_at desc);

alter table public.shorts enable row level security;

drop policy if exists "Cortos publicados visibles para todos" on public.shorts;
create policy "Cortos publicados visibles para todos" on public.shorts
    for select using (published or (select public.is_admin()));

drop policy if exists "Administradores crean cortos" on public.shorts;
create policy "Administradores crean cortos" on public.shorts
    for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "Administradores editan cortos" on public.shorts;
create policy "Administradores editan cortos" on public.shorts
    for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Administradores borran cortos" on public.shorts;
create policy "Administradores borran cortos" on public.shorts
    for delete to authenticated using ((select public.is_admin()));

revoke all on public.shorts from anon, authenticated;
grant select on public.shorts to anon, authenticated;
grant insert (slug, title, year, genre, thumbnail, poster, trailer, movie, synopsis, laurels, position, published)
    on public.shorts to authenticated;
-- El slug no se puede cambiar: las valoraciones y comentarios van unidos a él.
grant update (title, year, genre, thumbnail, poster, trailer, movie, synopsis, laurels, position, published)
    on public.shorts to authenticated;
grant delete on public.shorts to authenticated;

-- Limpia los textos, comprueba los festivales y guarda la fecha de modificación.
create or replace function public.prepare_short()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.title    := btrim(new.title);
    new.genre    := btrim(new.genre);
    new.synopsis := btrim(new.synopsis);
    if exists (
        select 1 from jsonb_array_elements(new.laurels) l
         where jsonb_typeof(l) <> 'object'
            or coalesce(jsonb_typeof(l -> 'name'), '') <> 'string'
            or char_length(btrim(l ->> 'name')) not between 1 and 120
            or (l ? 'type' and (jsonb_typeof(l -> 'type') <> 'string' or char_length(l ->> 'type') > 60))
    ) then
        raise exception 'invalid_laurels' using errcode = '22023';
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists shorts_prepare on public.shorts;
create trigger shorts_prepare
    before insert or update on public.shorts
    for each row execute function public.prepare_short();

revoke all on function public.prepare_short() from public, anon, authenticated;

-- Cortos que ya estaban en js/data.js. Solo se añaden si no existen todavía,
-- así que volver a ejecutar el archivo no deshace lo que cambies en el panel.
insert into public.shorts (slug, title, year, genre, thumbnail, poster, trailer, movie, synopsis, laurels, position) values
    ('inesperado', 'INESPERADO', 2026, 'Thriller psicológico / Suspense', 'img/ines.png', 'img/poster.png', '', 'https://youtu.be/9qFP3xbwsK4',
     'Un joven aislado con sus auriculares en casa experimenta una creciente sensación de paranoia y claustrofobia, hasta que unos golpes secos y repentinos en la puerta rompen el silencio y desatan una pesadilla de la que es imposible escapar.',
     '[]', 10),
    ('subidon', 'SUBIDÓN', 2026, 'Suspense.', 'img/subidon.png', 'img/subidonposter.png', '', 'https://youtu.be/ulkTQpwLgxQ',
     'Un joven se aísla con la música de sus cascos, buscando escapar de su propia mente en una espiral de ritmo y paranoia.',
     '[]', 20),
    ('el-exito-te-mata', 'EL EXITÓ TE MATA', 2026, 'Thriller psicológico.', 'img/exitomata.png', 'img/elexitoposter.png', '', 'https://youtu.be/w6OSmCYD-lc',
     'La ambición desmedida y la obsesión por la fama ciegan por completo a un aspirante a estrella, que fantasea constantemente con ser el centro de atención a cualquier precio. Sin embargo, ignora que la línea entre el éxito y la destrucción personal es muy fina, y la realidad acabará por golpearle de la forma más inesperada.',
     '[]', 30),
    ('ese-nombre-me-suena', 'ESE NOMBRE ME SUENA', 2026, 'Thriller psicológico / Suspense.', 'img/bate.png', 'img/bateposter.png', 'https://youtu.be/0FjE0RmSkrs', 'https://youtu.be/Yc8U1BxB_e4',
     'Dos amigos hablan por teléfono y uno de ellos, completamente borracho, suelta una confidencia sobre su pareja. Lo que empieza como una charla entre colegas deriva rápidamente en una espiral de tensión, paranoia y un final fatal.',
     '[]', 40),
    ('obsession-2', 'Obsession 2', 2026, 'Terror psicológico', 'img/OBSESSIONH.png', 'img/obsession-poster.jpg', 'https://youtu.be/jwrhwtHvAKQ', '',
     'Vuelve el terror psicológico con la secuela de Obsession. Luis solo quería que Carmen no se fuera, pero al pedir un deseo prohibido, el amor se ha convertido en una pesadilla sangrienta de la que nadie sale vivo.',
     '[]', 50),
    ('looper', 'LOOPER', null, 'Suspense', 'img/LOOPERH.webp', 'img/looper-poster.jpg', 'https://youtu.be/Oq3WvwN5hwg', 'https://youtu.be/aYMR9QImSBM',
     'Atrapado en un bucle de tensión y silencio, un hombre con la boca sellada y las manos manchadas de sangre se enfrenta a una presencia enmascarada en una azotea desolada.',
     '[]', 60),
    ('sonoro', 'SONORO parte 1 y parte 2', null, 'Terror', 'img/SONOROH.png', 'img/sonoro-poster.jpg', '', 'https://youtu.be/i885vW4GWgA',
     'Unos auriculares y un cable aparentemente inofensivos se convierten en la peor pesadilla de un joven en su propia casa.',
     '[{"type": "Finalista", "name": "HorrorHound Festival"}, {"type": "Seleccionado", "name": "Almamoura FilmFestival"}]', 70),
    ('below', 'BELOW', null, 'Terror', 'img/BELOWH.png', 'img/below-poster.jpg', 'https://youtu.be/fnF0reh733Y', 'https://youtu.be/Bx_djthAw_s',
     '¿Qué se esconde justo debajo de tus pies cuando crees que estás a salvo en casa? Una atmósfera claustrofóbica, golpes secos en la oscuridad y una tensión insoportable.',
     '[]', 80),
    ('tengo-algo-que-decirte', 'TENGO ALGO QUE DECIRTE', null, '', 'img/TENGO.png', 'img/obs.png', 'https://youtu.be/Et5hKaKB6Fo', 'https://youtu.be/Pe1yrnFOLB4',
     'Una tensa llamada nocturna entre una pareja por un supuesto control excesivo da un giro radicalmente aterrorizante cuando ella afirma estar esperándole en la sala de un cine que a medianoche debería estar cerrado, convirtiendo una discusión rutinaria en una pesadilla claustrofóbica.',
     '[]', 90)
on conflict (slug) do nothing;

-- ---------- Imágenes de los cortos (Supabase Storage) ----------
-- Carpeta pública "shorts-media": cualquiera puede VER las imágenes,
-- solo los administradores pueden subirlas, cambiarlas o borrarlas.
-- Máximo 5 MB por imagen; solo PNG, JPG, WEBP o AVIF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shorts-media', 'shorts-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Administradores ven imagenes de cortos" on storage.objects;
create policy "Administradores ven imagenes de cortos" on storage.objects
    for select to authenticated using (bucket_id = 'shorts-media' and (select public.is_admin()));

drop policy if exists "Administradores suben imagenes de cortos" on storage.objects;
create policy "Administradores suben imagenes de cortos" on storage.objects
    for insert to authenticated with check (bucket_id = 'shorts-media' and (select public.is_admin()));

drop policy if exists "Administradores cambian imagenes de cortos" on storage.objects;
create policy "Administradores cambian imagenes de cortos" on storage.objects
    for update to authenticated using (bucket_id = 'shorts-media' and (select public.is_admin()));

drop policy if exists "Administradores borran imagenes de cortos" on storage.objects;
create policy "Administradores borran imagenes de cortos" on storage.objects
    for delete to authenticated using (bucket_id = 'shorts-media' and (select public.is_admin()));

-- ---------- Limpieza opcional ----------
-- La tabla de votos anónimos de la versión anterior ya no se usa.
-- Si la creaste y quieres borrarla, quita los dos guiones de la línea siguiente:
-- drop table if exists public.film_votes;
