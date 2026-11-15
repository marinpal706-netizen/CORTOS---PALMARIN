---
name: PLMRN Studio
description: Portal de streaming de los cortos de PLMRN Studio; azul noche, blanco y los fotogramas de las propias películas.
colors:
  azul-noche: "#0b1018"
  azul-noche-profundo: "#070b11"
  superficie-marino: "#121a26"
  superficie-marino-alta: "#1a2433"
  superficie-marino-tope: "#243046"
  hilo-blanco: "rgba(255, 255, 255, 0.08)"
  hilo-blanco-marcado: "rgba(255, 255, 255, 0.18)"
  blanco: "#ffffff"
  blanco-suave: "rgba(255, 255, 255, 0.86)"
  gris-niebla: "#b4bccb"
  gris-pizarra: "#8b95a7"
  cristal: "rgba(255, 255, 255, 0.14)"
  cristal-intenso: "rgba(255, 255, 255, 0.22)"
  estado-exito: "#6ee7a8"
  estado-error: "#ff8a8a"
  estado-info: "#b9c8ff"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.5rem, 5.4vw, 4.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  item:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  pill: "999px"
spacing:
  edge: "clamp(16px, 4vw, 56px)"
  header: "72px"
  row-gap: "14px"
  grid-gap: "24px"
  row-rhythm: "44px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.azul-noche}"
    typography: "{typography.item}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.blanco-suave}"
    textColor: "{colors.azul-noche}"
  button-primary-light:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.azul-noche}"
    rounded: "{rounded.pill}"
    padding: "13px 28px"
  button-glass:
    backgroundColor: "{colors.cristal-intenso}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.cristal}"
    textColor: "{colors.blanco}"
  chip:
    backgroundColor: "{colors.superficie-marino-alta}"
    textColor: "{colors.gris-niebla}"
    rounded: "{rounded.pill}"
    padding: "9px 16px"
  chip-hover:
    backgroundColor: "{colors.superficie-marino-tope}"
    textColor: "{colors.blanco}"
  chip-active:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.azul-noche}"
  search-field:
    backgroundColor: "{colors.superficie-marino-alta}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
  nav-link:
    textColor: "{colors.gris-niebla}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  nav-link-active:
    textColor: "{colors.blanco}"
  row-tile:
    backgroundColor: "{colors.superficie-marino}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.md}"
    width: "clamp(250px, 23vw, 350px)"
  catalogue-card:
    backgroundColor: "{colors.superficie-marino}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.lg}"
    padding: "16px 18px 20px"
  catalogue-card-hover:
    backgroundColor: "{colors.superficie-marino-alta}"
  hero-meta-pill:
    backgroundColor: "{colors.cristal}"
    textColor: "{colors.blanco}"
    rounded: "{rounded.pill}"
    padding: "5px 13px"
  laurel-pill:
    backgroundColor: "{colors.superficie-marino-alta}"
    textColor: "{colors.blanco-suave}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 4px"
  laurel-type:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.azul-noche}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Design System: PLMRN Studio

## Overview

**Creative North Star: "La sala en casa"**

PLMRN se presenta como una plataforma de streaming de sus propios cortos: se entra a un corto que ya se está reproduciendo, se pasa al siguiente con un gesto y luego se recorren filas por estado de ánimo hasta el catálogo completo. El sistema juega el estándar del género sin ironía; la identidad del estudio no la ponen adornos sino la calidad de los fotogramas y el cuidado del oficio (alineación, ritmo, transiciones).

El mundo tiene dos colores: un azul noche que hace de sala a oscuras, con superficies marinas en capas, y el blanco, que es a la vez el texto y el único acento. Todo lo que pide atención (la acción principal, el estado activo, las estrellas, los corazones, el anillo de hover) es blanco. Las formas son redondeadas y amables: píldoras para cada acción, mosaicos con esquinas suaves, paneles de esquina amplia. La densidad es la de un portal: imágenes grandes, filas deslizables y texto breve encima de la imagen, nunca un muro de párrafos.

Rechazos confirmados por el propietario: un estilo editorial sobrio (programa de mano, serif de cartel) y un sistema de cartones de color por género. El portal no es minimalista ni frío: el calor lo aportan la imagen, el clip en movimiento y las formas redondas.

**Key Characteristics:**
- Fondo azul noche con superficies marinas en tres alturas; blanco como único acento.
- Imágenes que solo salen de las películas: fotogramas y clips.
- Carrusel a sangre con clip de YouTube silenciado que aparece cuando ya se reproduce.
- Filas deslizables de mosaicos 16:9 con el título sobre un degradado.
- Píldoras para todas las acciones; una sola familia tipográfica, Figtree, en negrita para los títulos.
- Todos los bordes alineados a un margen lateral común.

## Colors

Una paleta de dos colores: azul noche para el espacio y blanco para todo lo que se lee o se toca.

### Primary
- **Blanco** (`blanco`): el único acento. Texto principal, botón primario, chip activo, estrellas encendidas, corazón de favorito, avatar, anillo de foco y anillo de hover de los mosaicos. Su fuerza viene de que nada más compite con él.
- **Blanco suave** (`blanco-suave`): sinopsis del carrusel, cuerpo de comentarios, nombres de laureles y estado hover del botón primario.

### Neutral
- **Azul noche** (`azul-noche`): el fondo de toda la web y el color de las sombras de degradado sobre las imágenes.
- **Azul noche profundo** (`azul-noche-profundo`): base del carrusel y de la ficha mientras carga la imagen, pie de página y degradado de los mosaicos.
- **Superficie marino** (`superficie-marino`): tarjetas del catálogo, mosaicos, paneles de la ficha, barra de filtros, diálogo de acceso.
- **Superficie marino alta** (`superficie-marino-alta`): chips, campo de búsqueda, contadores, laureles, campos de formulario y hover de tarjeta.
- **Superficie marino tope** (`superficie-marino-tope`): hover de chip, campo con foco, brillo del esqueleto de carga, barra de desplazamiento.
- **Hilo blanco** (`hilo-blanco`) y **hilo blanco marcado** (`hilo-blanco-marcado`): divisores, borde de la cabecera, bordes de campos, flechas y botón fantasma.
- **Gris niebla** (`gris-niebla`): texto secundario (subtítulos de fila, metadatos de tarjeta, enlaces de navegación en reposo, etiquetas de campo).
- **Gris pizarra** (`gris-pizarra`): texto terciario (placeholders, fechas, contadores, pie de página).
- **Cristal** (`cristal`) y **cristal intenso** (`cristal-intenso`): blanco translúcido con desenfoque para píldoras de metadatos y botones secundarios sobre imagen, y para el hover de enlaces y acciones discretas.

### Status
- **Verde estado** (`estado-exito`), **rojo estado** (`estado-error`) y **azul estado** (`estado-info`): exclusivos de los mensajes de formulario (acceso, comentarios, valoraciones). No son acentos y no decoran nada.

### Named Rules
**The Two-Colour Rule.** Solo existen el azul noche y el blanco. El género nunca se codifica con color: terror, suspense o cualquier género futuro comparten la misma paleta, y se distinguen por la fila y por la imagen.

**The Status-Only Rule.** Los colores de estado solo aparecen en mensajes de formulario. Si un elemento necesita destacar, se hace blanco, no verde, rojo ni azul.

## Typography

**Display Font:** Figtree (con system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Figtree (la misma familia)

**Character:** una sola sans geométrica y cálida en todo el rango; la jerarquía la hacen el peso (800 en títulos, 700 en nombres de corto, 400 en texto) y el tracking negativo de los tamaños grandes, no un segundo tipo de letra.

### Hierarchy
- **Display** (800, `clamp(2.5rem, 5.4vw, 4.75rem)`, interlineado 1, tracking -0.03em, `text-wrap: balance`): título del carrusel y de la ficha del corto, siempre sobre imagen y con una sombra de texto difusa. En móvil baja a `clamp(2.1rem, 9.5vw, 3rem)`.
- **Headline** (800, `clamp(1.7rem, 3vw, 2.25rem)`, 1.1, -0.02em): títulos de sección del catálogo y de páginas de texto.
- **Title** (800, `clamp(1.3rem, 2.2vw, 1.6rem)`, 1.2, -0.015em): título de cada fila deslizable y de los paneles de la ficha.
- **Item** (700, 1.05rem en mosaicos y 1.15rem en tarjetas, 1.2–1.25): nombre del corto.
- **Body** (400, 16px, 1.55; 15px por debajo de 600px): texto general. La sinopsis del carrusel va a 1.08rem, máximo 56ch y dos líneas; la sinopsis de la ficha a 1.1rem, 1.65 y máximo 64ch.
- **Label** (700, 0.8rem, tracking 0.08em, mayúsculas, gris niebla): encabezado de panel en la ficha ("Sinopsis", "Valoración") y títulos de columna del pie. Encabeza un bloque; no se coloca encima de un titular.

### Named Rules
**The One Family Rule.** Figtree en todo. Los títulos ganan presencia con peso 800 y tracking negativo, nunca con una tipografía de exhibición aparte.

## Layout

El espacio se organiza alrededor de un margen lateral fluido (`edge`). La cabecera, el bloque de texto del carrusel, las cabeceras de fila, el primer mosaico de cada fila, el catálogo y el pie empiezan todos en esa línea. Las filas son pistas horizontales a sangre: el desplazamiento llega hasta el borde de la pantalla, pero el relleno y el `scroll-padding` de la pista devuelven cada mosaico a la línea del margen al encajar.

- **Carrusel:** alto `clamp(540px, 84svh, 880px)` (móvil `clamp(500px, 76svh, 660px)`), texto abajo a la izquierda con un ancho máximo de 660px. La primera fila sube 72px sobre el carrusel (20px en móvil) para que las filas nazcan del degradado.
- **Ritmo:** 44px entre filas, 14px entre mosaicos, 24px entre tarjetas del catálogo (rejilla `auto-fill` de mínimo 280px), 72px antes de cada bloque de catálogo.
- **Contenedor:** 1320px como máximo para pie y páginas de texto; el catálogo y la cabecera ocupan todo el ancho para alinearse con las filas. Las páginas de texto se limitan a 860px.
- **Puntos de corte:** 960px (la ficha pasa a una columna y se oculta el póster), 760px (navegación deslizable bajo el logotipo, sin flechas, mosaicos al 74vw, una columna de tarjetas, acciones a ancho completo), 600px (cuerpo 15px).

### Named Rules
**The Edge Rule.** Todos los bordes se alinean a `edge`. Las flechas del carrusel y de las filas se colocan en el margen, fuera de esa línea, para no tapar nunca el título ni el primer mosaico.

**The Full-Width Thumb Rule.** En móvil, las acciones del carrusel y de la ficha se apilan en una sola columna y cada botón ocupa todo el ancho.

## Elevation & Depth

La profundidad nace sobre todo de capas tonales (azul noche, tres superficies marinas) y del cristal translúcido con desenfoque sobre la imagen. Las sombras son oscuras y difusas, hacia abajo, y aparecen como respuesta a un estado (hover de mosaico o tarjeta) o en piezas que flotan sobre la página (diálogo, menú de compartir, avisos, botón de volver arriba, póster de la ficha). La cabecera es translúcida con `blur(14px)`.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.75)`, token `--shadow-lift`): mosaico o tarjeta al pasar el ratón, siempre junto con un anillo blanco de 2px.
- **Flotante** (`0 20px 40px -12px rgba(0, 0, 0, 0.7)`): menú de compartir y avisos.
- **Diálogo** (`0 40px 80px -20px rgba(0, 0, 0, 0.85)`): ventana de acceso.
- **Póster** (`0 30px 60px -20px rgba(0, 0, 0, 0.8), 0 0 0 1px` hilo blanco marcado): póster vertical de la ficha.

### Named Rules
**The Lift-on-Response Rule.** Mosaicos y tarjetas están planos en reposo. Al pasar el ratón suben 4px, reciben la sombra Lift y un anillo blanco de 2px, y su imagen se acerca levemente (1.04–1.05).

## Shapes

Todo es redondo. Cuatro radios: 10px para miniaturas pequeñas y elementos de menú, 14px para mosaicos, laureles, campos de texto y avisos, 20px para tarjetas, paneles, vídeos y barra de filtros, y la píldora (999px) para cada botón, chip, campo de búsqueda, enlace de navegación y metadato. Los controles circulares (flechas, pausa, búsqueda, volver arriba, favorito) son círculos perfectos. Las imágenes se recortan dentro de su contenedor con `overflow: hidden`; 16:9 para mosaicos, tarjetas y vídeos, 3:4 para pósteres.

### Named Rules
**The Pill Rule.** Toda acción es una píldora. Blanco sólido para la principal; cristal translúcido para la secundaria sobre imagen; borde fino para la fantasma sobre superficie.

## Components

### Buttons
Rotundos y táctiles: peso 700, píldora, y una leve compresión al pulsar.
- **Shape:** píldora completa (999px), borde de 1.5px.
- **Primary:** fondo blanco, texto azul noche, 12px 24px. La variante sobre imagen ("Ver ahora") crece a 13px 28px y 1.02rem con el icono de play.
- **Hover / Focus:** el fondo pasa a blanco suave; al pulsar, `scale(0.97)`. El foco es un contorno blanco de 3px con 3px de separación, en todo el sitio.
- **Glass:** cristal intenso con `blur(10px)` y texto blanco; en hover el blanco sube a 0.32 de opacidad. Es la acción secundaria sobre imagen ("Más información", "Ver tráiler").
- **Ghost:** transparente con borde de hilo blanco marcado; en hover toma cristal y el borde se vuelve blanco. Para acciones secundarias sobre superficie (compartir, cerrar sesión). Dentro de la ficha a sangre se comporta como glass.
- **Small:** 8px 16px y 0.88rem para la cabecera y los formularios.

### Chips
- **Style:** píldora, superficie marino alta, texto gris niebla, 600, 9px 16px.
- **State:** en hover, superficie marino tope y texto blanco; activo, fondo blanco y texto azul noche. El chip de favoritos lleva el corazón, que se rellena cuando está activo.

### Cards / Containers
- **Tarjeta del catálogo:** radio 20px, superficie marino, imagen 16:9 arriba y cuerpo de 16px 18px 20px con título, metadatos, estrellas, dos líneas de sinopsis y laureles compactos. En hover: elevación Lift, anillo blanco, superficie marino alta y un círculo blanco de play de 56px que aparece en el centro de la imagen.
- **Paneles de la ficha:** radio 20px, superficie marino, 28px de relleno (20px en móvil), sin borde.
- **Shadow Strategy:** ver Elevation & Depth; plano en reposo.

### Inputs / Fields
- **Búsqueda:** píldora de superficie marino alta con icono de lupa SVG a la izquierda, sin borde visible en reposo (borde transparente de 1.5px). Con foco, el borde y el icono se vuelven blancos.
- **Campos de formulario:** radio 14px, superficie marino alta, borde de hilo blanco marcado; con foco, borde blanco y fondo marino tope.
- **Selector de orden:** píldora con flecha SVG blanca; en hover y foco, borde blanco.
- **Error / Disabled:** los mensajes usan los colores de estado; los botones desactivados bajan al 40% de opacidad.

### Navigation
- **Cabecera:** fija, azul noche al 88% con desenfoque, borde inferior de hilo blanco, 72px de alto (64px en móvil). Logotipo de texto "PLMRN" (800, tracking 0.04em) con la etiqueta "Studio" en mayúsculas espaciadas, enlaces en píldora y un botón circular de búsqueda.
- **Enlaces:** gris niebla, 500, 8px 14px; en hover, blanco sobre cristal; activo, blanco y 700.
- **Móvil:** los enlaces pasan a una tira deslizable bajo el logotipo, a sangre, sin barra visible.

### Carrusel destacado (signature)
Los cinco cortos más recientes a sangre, con un fundido de 0.8s entre diapositivas y un acercamiento lento de la imagen (14s). Tres degradados de azul noche (de abajo, de la izquierda y una franja arriba) dejan legible el bloque de abajo a la izquierda: título display, píldoras de metadatos en cristal (año, género, valoración), dos líneas de sinopsis y las acciones. Flechas circulares translúcidas en los márgenes y, abajo a la derecha, puntos (el activo se alarga a 30px y se vuelve blanco) y un botón de pausa.

### Clip de fondo
El tráiler (o la película, saltando los créditos iniciales) se carga silenciado detrás de la imagen. Solo se muestra cuando YouTube confirma que se está reproduciendo (estado 1) y han pasado 3s, lo que tardan en desaparecer sus controles; si pasa a cargar, pausa o termina, se oculta de nuevo. Funciona solo en ordenador con puntero fino, y se desactiva con movimiento reducido o ahorro de datos. La imagen fija es siempre la base y el respaldo: nunca se ve un reproductor parado.

### Mosaico de fila
16:9, radio 14px, ancho `clamp(250px, 23vw, 350px)` (74vw en móvil), encaje al inicio. Título (700) y año · género sobre un degradado de azul noche profundo en la parte inferior. Hover: elevación Lift con anillo blanco de 2px y la imagen al 1.05. El corazón de favorito va en un círculo oscuro arriba a la derecha.

### Píldora de metadatos del carrusel
Píldora de cristal con `blur(8px)`, 5px 13px, 0.85rem, 600; la valoración lleva una estrella blanca de 14px.

### Laureles
Cada selección es una fila de superficie marino alta con una etiqueta de tipo en blanco sólido (mayúsculas, 800, "FINALISTA", "SELECCIONADO") y el nombre del festival. En tarjetas, la versión compacta es una píldora: etiqueta a 0.64rem y nombre en blanco suave a 0.78rem.

### Named Rules
**The Films-Only Imagery Rule.** Las imágenes salen solo de los cortos: fotogramas, miniaturas, pósteres y clips. Ni fotos de archivo, ni ilustraciones, ni texturas decorativas. Si una imagen falla, se muestra el título en gris pizarra sobre la superficie.

**The Clip-Earns-Its-Place Rule.** El clip aparece solo tras la confirmación de reproducción (estado 1 más 3s), solo con puntero fino de ordenador, nunca con movimiento reducido ni ahorro de datos. La imagen fija es el respaldo.

**The Clean-Frame Rule.** El carrusel, la ficha y los mosaicos prefieren el campo opcional `backdrop` (un fotograma limpio, sin letras) a la miniatura con el título incrustado. Hoy esos fotogramas limpios todavía no existen: hasta que se suban, la miniatura de cartel (con el título quemado) es el respaldo, y por eso a veces el título aparece dos veces. Las tarjetas del catálogo usan la miniatura.

## Do's and Don'ts

### Do:
- **Do** usar blanco (`blanco`) para cualquier cosa que deba destacar: acción principal, estado activo, estrellas, corazón, anillo de hover y foco.
- **Do** alinear todo borde izquierdo al margen `edge` (`clamp(16px, 4vw, 56px)`).
- **Do** hacer cada acción una píldora: blanco sólido para la principal, cristal (`cristal-intenso`, `blur(10px)`) para la secundaria sobre imagen, fantasma para la secundaria sobre superficie.
- **Do** poner el título sobre la imagen con un degradado de azul noche, nunca en una caja aparte en los mosaicos.
- **Do** dar a las acciones del carrusel y de la ficha el ancho completo en móvil (por debajo de 760px).
- **Do** usar `backdrop` cuando exista y la miniatura como respaldo, a través de una única función.
- **Do** apagar animaciones, transiciones y clips con movimiento reducido.

### Don't:
- **Don't** asignar un color a un género ni añadir un tercer color de marca.
- **Don't** usar verde, rojo o azul de estado fuera de los mensajes de formulario.
- **Don't** usar imágenes que no salgan de los propios cortos.
- **Don't** mostrar el clip antes de que YouTube confirme la reproducción, ni en móvil, ni con ahorro de datos.
- **Don't** usar esquinas rectas ni botones rectangulares; los radios son 10, 14, 20 o píldora.
- **Don't** introducir una segunda familia tipográfica para los títulos.
- **Don't** colocar las flechas de navegación encima del título o del primer mosaico.
