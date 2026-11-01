# Configurar Supabase (cuentas, valoraciones y comentarios)

La web está en GitHub Pages (solo archivos estáticos), así que las cuentas,
los votos y los comentarios se guardan en Supabase.

Proyecto: `https://cohizgnbpmapwccbpesv.supabase.co`
Web: `https://marinpal706-netizen.github.io/CORTOS---PALMARIN/`

## 1. Ejecutar el SQL

1. En Supabase abre **SQL Editor** → **New query** (o *Create a new snippet*).
2. Copia **todo** el contenido de [`schema.sql`](schema.sql), pégalo y pulsa **Run**.
3. Debe aparecer *Success. No rows returned*. Si avisa de "destructive operations", confirma.

Puedes volver a ejecutarlo siempre que se actualice el archivo: no se pierden
cuentas, votos ni comentarios.

## 2. Cuentas con nombre de usuario (sin email)

Las cuentas se crean con **nombre de usuario + contraseña**. Supabase necesita
un email por dentro, así que la web usa uno interno que nunca recibe correos
(`usuario@usuarios.plmrn.invalid`). Por eso hay que desactivar la confirmación:

1. **Authentication → Sign In / Providers → Email**
2. **Confirm email**: **desactivado**. Pulsa **Save**.

Así no se envía ningún correo y no existe el límite de emails por hora.

Las cuentas creadas antes con email siguen funcionando: escriben su email en
el campo "Nombre de usuario". Se les ha asignado un nombre automático
(parte de su email + 4 caracteres) que puedes cambiar en **Table Editor → profiles**.

### Si alguien olvida su contraseña

No se puede recuperar por email. Puedes ponerle una nueva desde
**SQL Editor** (cambia el nombre y la contraseña):

```sql
update auth.users
   set encrypted_password = extensions.crypt('NuevaClave123', extensions.gen_salt('bf'))
 where id = (select id from public.profiles where lower(username) = lower('nombre_usuario'));
```

Después dile a esa persona su nueva contraseña.

## 3. Conectar la web

Ya está hecho en [`js/config.js`](../js/config.js) con la **Project URL** y la
**Publishable key**.

> **Nunca** pongas la clave **secret** / **service_role** en la web: todo el
> código de GitHub Pages es público.

## 4. Moderar comentarios

- Cada usuario puede borrar sus propios comentarios desde la web.
- Tú puedes borrar cualquiera en **Table Editor → film_comments**: marca la fila
  y pulsa **Delete**.
- Para expulsar a alguien: **Authentication → Users** → ⋮ → **Delete user**
  (se borran también sus votos y comentarios).

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `profiles` | Nombre de usuario público de cada cuenta (se crea solo al registrarse). |
| `film_user_votes` | Un voto por (corto, usuario). Cada usuario solo puede leer el suyo. |
| `film_ratings` | Suma de puntuaciones y número de votos por corto (se actualiza sola). |
| `film_rating_summary` | Vista pública con la media ya calculada. |
| `submit_rating(p_film, p_score)` | Endpoint de voto. Exige sesión; crea o cambia el voto y devuelve la nueva media. |
| `film_comments` | Comentarios. Lectura pública; escribir y borrar solo con sesión y solo los propios. Máx. 1000 caracteres y uno cada 15 segundos por usuario. Guarda la valoración que tenía el autor al comentar (columna `score`). |
| `username_available(p_username)` | Comprueba si un nombre de usuario está libre al registrarse. |

## Problemas frecuentes

- **"No se ha podido completar el registro"** → *Confirm email* sigue activado (paso 2).
- **"Ese nombre de usuario ya está en uso"** → otra cuenta lo tiene (sin importar mayúsculas).
- **"Usuario o contraseña incorrectos"** → revisa la contraseña; si la olvidó, mira el paso 2.
- **No salen los comentarios ni el botón "Entrar"** → el SQL no se ha ejecutado
  entero, o el navegador usa archivos antiguos (prueba en una ventana de incógnito).
