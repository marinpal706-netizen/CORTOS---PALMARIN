# Configurar Supabase (cuentas + valoraciones)

La web está en GitHub Pages (solo archivos estáticos), así que las cuentas de
usuario y los votos se guardan en Supabase. Sigue estos pasos una sola vez.

## 1. Crear el proyecto

1. Entra en <https://supabase.com>, crea una cuenta gratuita y pulsa **New project**.
2. Elige un nombre (por ejemplo `plmrn`), una contraseña para la base de datos
   (guárdala, no la necesita la web) y la región más cercana (por ejemplo *West EU*).

## 2. Crear las tablas y el endpoint de voto

1. En el menú de la izquierda abre **SQL Editor** → **New query**.
2. Copia **todo** el contenido de [`schema.sql`](schema.sql), pégalo y pulsa **Run**.
3. Debe aparecer *Success. No rows returned*.

Puedes volver a ejecutarlo más adelante (por ejemplo, si actualizamos el archivo)
sin perder votos ni cuentas.

## 3. Configurar el acceso con email y contraseña

En **Authentication**:

1. **Sign In / Providers → Email**: comprueba que está activado.
   - **Confirm email** activado (recomendado): al registrarse, el usuario recibe
     un email y debe pulsar el enlace antes de poder entrar.
   - Si lo desactivas, la cuenta queda lista al momento (útil para pruebas).
   - **Minimum password length**: la web pide 6 como mínimo; si subes este valor,
     cambia también `MIN_PASSWORD_LENGTH` en `js/auth.js`.
2. **URL Configuration**:
   - **Site URL**: la dirección de tu web en GitHub Pages, por ejemplo
     `https://TU-USUARIO.github.io/TU-REPOSITORIO/`
   - **Redirect URLs**: añade `https://TU-USUARIO.github.io/TU-REPOSITORIO/**`
     (con los dos asteriscos). Es a donde vuelve el usuario tras confirmar su email.
     Si pruebas la web en tu ordenador, añade también la dirección local que uses.
3. **Emails** (opcional): en *Templates* puedes traducir al español el email de
   confirmación. El servicio de email incluido en Supabase solo envía unos pocos
   correos por hora: si esperas muchos registros, configura un SMTP propio en
   *SMTP Settings*.

## 4. Conectar la web

1. Abre **Project Settings → API Keys** (o **Data API**).
2. Copia la **Project URL** (algo como `https://abcdefghijkl.supabase.co`).
3. Copia la clave pública: **Publishable key** (`sb_publishable_...`) o, en
   proyectos antiguos, la **anon public** (`eyJ...`).
4. Pégalas en [`js/config.js`](../js/config.js):

   ```js
   const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
   const SUPABASE_KEY = 'sb_publishable_...';
   ```

> ⚠️ **Nunca** pongas la clave **secret** / **service_role** en la web: todo el
> código de GitHub Pages es público. La clave pública es segura porque las
> reglas de `schema.sql` (Row Level Security) limitan lo que se puede hacer con ella.

## 5. Publicar y probar

1. Sube los cambios a GitHub y espera a que GitHub Pages se actualice (1–2 min).
2. Abre la web → **Entrar** → **Crear cuenta** con tu email.
3. Confirma el email, inicia sesión y valora un corto.
4. En Supabase, **Table Editor → film_user_votes** debería mostrar tu voto y
   **film_ratings** el total actualizado.

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `film_user_votes` | Un voto por (corto, usuario). Cada usuario solo puede leer el suyo. |
| `film_ratings` | Suma de puntuaciones y número de votos por corto. Se actualiza sola con un trigger. |
| `film_rating_summary` | Vista pública con la media ya calculada (2 decimales). |
| `submit_rating(p_film, p_score)` | Endpoint (`POST /rest/v1/rpc/submit_rating`). Exige sesión, crea o cambia el voto y devuelve `{ status, your_score, average, votes }`. |

Si un usuario borra su cuenta (desde **Authentication → Users**), sus votos se
eliminan y los totales se recalculan automáticamente.

## Problemas frecuentes

- **"Email o contraseña incorrectos"** con datos correctos → la cuenta aún no
  está confirmada, o se registró con otro email.
- **El enlace del email lleva a `localhost` o da error** → revisa *Site URL* y
  *Redirect URLs* (paso 3).
- **No llega el email** → mira en spam; el servicio gratuito de Supabase tiene
  un límite de envíos por hora.
- **"Las valoraciones estarán disponibles muy pronto"** → `js/config.js` está
  vacío o la clave no es correcta.
