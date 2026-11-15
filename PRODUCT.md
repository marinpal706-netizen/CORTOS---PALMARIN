# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos públicos con el mismo peso; la web tiene que servir igual de bien a ambos:

- **Fans del canal.** Espectadores que llegan desde YouTube, Instagram o TikTok para ver los cortos, valorarlos, comentarlos y guardarlos en favoritos. Muchos entran desde el móvil y desde un enlace compartido.
- **Festivales y colaboradores.** Programadores, jurados y posibles colaboradores que evalúan el trabajo del estudio: buscan la ficha de cada corto, el tráiler, la película completa, los laureles y una forma de contactar.

## Product Purpose

PLMRN es el portal oficial de PLMRN Studio, un pequeño estudio independiente que escribe, rueda y monta cortometrajes (hasta ahora de terror y suspense; el catálogo se ampliará a otros géneros). Reúne en un solo sitio todos los cortos (con su ficha, tráiler y película completa en YouTube) y los guiones con sus reconocimientos.

El éxito se mide en dos cosas:

1. **Comunidad activa:** que la gente se cree cuenta, vote, comente, responda y guarde favoritos.
2. **Credibilidad:** que festivales y colaboradores se tomen en serio al estudio y escriban para proponer proyecto o programación.

## Positioning

Es la casa propia de un estudio de autor, no un canal más: el catálogo completo de una sola voz (hasta ahora paranoia, obsesión y miedo a lo cotidiano), con ficha, laureles y conversación alrededor de cada corto, cosa que YouTube no ofrece de forma ordenada.

## Operating Context

- Los cortos se publican completos y gratis en el canal de YouTube; la web los incrusta o enlaza.
- Cada corto tiene su página `corto.html?id=<slug>` con póster vertical, miniatura horizontal, tráiler y película.
- Los cortos se gestionan desde `admin.html` (sin enlace en el menú) y se guardan en Supabase; `js/data.js` es solo copia de seguridad si Supabase no responde.
- Las cuentas son de nombre de usuario + contraseña, sin email real; no se puede recuperar la contraseña por correo.
- Los enlaces se comparten mucho en WhatsApp y redes, así que la vista previa (Open Graph) importa.

## Capabilities and Constraints

- **Stack actual:** HTML, CSS y JavaScript estáticos, sin framework ni compilación, publicados en GitHub Pages. Supabase guarda cuentas, votos, comentarios (con respuestas y "me gusta"), favoritos, administradores y el catálogo de cortos. Turnstile protege los formularios.
- **Funciones:** catálogo con búsqueda, filtro por género, orden (recientes, mejor valorados, más votados, A–Z) y filtro de favoritos; ficha de corto con valoración por estrellas, comentarios y menú de compartir; sección de guiones; página "Sobre nosotros" con estadísticas y contacto; aviso legal, privacidad y 404.
- **Gratis y abierto (compromiso firme):** todos los cortos se ven completos y gratis. Nunca habrá muro de pago ni registro obligatorio para verlos; la cuenta solo sirve para participar.
- **Caché manual:** al cambiar cualquier archivo de `css/` o `js/` hay que subir el `?v=N` en todos los `.html`.
- **Sin decidir:** si la web seguirá solo en español (hoy lo está) y si se mantendrá siempre sin paso de compilación. No se confirmaron como restricciones.

## Brand Commitments

- Nombre: **PLMRN Studio** (logotipo de texto "PLMRN" con la etiqueta "Studio").
- Idioma de la web: español.
- Temática: hoy el catálogo es de terror, suspense y thriller psicológico, pero **el estudio hará también otros géneros**. La identidad no debe atarse al terror; textos como "no te dejarán dormir" son específicos del género actual y tendrán que revisarse.
- El estilo debe sentirse profesional y transversal a géneros.
- **Preferencia visual del propietario (noviembre de 2026):** estilo de plataforma de streaming de cortos (carrusel destacado al inicio con clips de los cortos, filas por género, títulos sobre las miniaturas). Solo **dos colores**: azul noche y blanco. Formas **redondeadas** y aspecto actual; ni minimalista ni frío. Rechazó un estilo editorial sobrio y otro de cartones de color por género.

## Evidence on Hand

- Pósteres y miniaturas reales de los cortos en `img/` (INESPERADO, SUBIDÓN, EL ÉXITO TE MATA, ESE NOMBRE ME SUENA, Obsession 2, LOOPER, SONORO, BELOW, TENGO ALGO QUE DECIRTE, entre otros).
- Laureles reales: SONORO, **Finalista** en HorrorHound Festival y **Seleccionado** en Almamoura FilmFestival. El guion "El Último fotograma", **Seleccionado** en "Concurso de Guion Corto 2026".
- Perfiles reales en YouTube, Instagram y TikTok (en `js/site.js`).
- **Falta:** la portada del guion (`img/portadaguion.jpg` está referenciada pero no existe en el repositorio).
- **No existen y no se deben inventar:** testimonios, citas de prensa, cifras de visualizaciones, premios o festivales que no figuren en los datos.

## Product Principles

1. **El corto primero.** Cada pantalla acerca al visitante a ver la película; nada se interpone entre él y el play.
2. **Dos lecturas, una web.** Lo que hace disfrutar al fan (ver, votar, comentar) también tiene que convencer al programador (ficha clara, laureles, contacto).
3. **Participar sin obligación.** Ver nunca exige cuenta; crear una cuenta debe merecer la pena por lo que permite hacer.
4. **Credibilidad con hechos.** Solo se muestran reconocimientos y datos reales; la seriedad se gana con orden y precisión, no con adornos.
