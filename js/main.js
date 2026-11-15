// Utilidades compartidas por todas las páginas.

// Escapa texto antes de meterlo en HTML generado.
function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Convierte cualquier enlace de YouTube en una URL de inserción (embed).
function toYouTubeEmbed(url) {
    if (!url) return '';
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0` : '';
}

// ---------- Géneros ----------
// Cada corto se agrupa en la fila de su primer género reconocido.
const GENRE_ROWS = [
    { key: 'terror',     pattern: /terror|horror|miedo/,                         title: 'Para ver con la luz encendida', sub: 'Cortos de terror' },
    { key: 'suspense',   pattern: /suspense|thriller|intriga|misterio|policiac/, title: 'Sin quitarle ojo',              sub: 'Suspense y thriller' },
    { key: 'drama',      pattern: /drama/,                                       title: 'Historias que se quedan',       sub: 'Cortos de drama' },
    { key: 'comedia',    pattern: /comedia|humor|comic/,                         title: 'Para reírse un rato',           sub: 'Comedia y humor' },
    { key: 'documental', pattern: /documental|making|detras/,                    title: 'Lo que pasó de verdad',         sub: 'Documentales y making of' },
    { key: 'musical',    pattern: /videoclip|musical|music|experimental/,        title: 'Imagen y música',               sub: 'Videoclips y piezas experimentales' }
];

function genreKey(genre) {
    const text = (genre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let best = null;
    GENRE_ROWS.forEach(({ key, pattern }) => {
        const match = text.match(pattern);
        if (match && (best === null || match.index < best.index)) best = { key, index: match.index };
    });
    return best ? best.key : null;
}

function cleanGenre(genre) {
    return (genre || '').replace(/\.+\s*$/, '').trim();
}

// ---------- Iconos ----------

const ARROW_LEFT_ICON = '<svg class="arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const ARROW_RIGHT_ICON = '<svg class="arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PLAY_ICON = '<svg class="play-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
const STAR_ICON = '<svg class="star-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const INFO_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';

// ---------- Clips de fondo ----------
// El tráiler (o la película) de YouTube se reproduce en silencio detrás de la portada.
// Solo en ordenador, y no si la persona prefiere menos movimiento o ahorra datos.

function youtubeId(url) {
    const match = (url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return match ? match[1] : '';
}

function clipsAllowed() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    // En móviles y tabletas YouTube enseña sus propios controles encima del vídeo,
    // así que allí se queda la imagen fija (y se ahorran datos).
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    return desktop && !reduce && !saveData;
}

// Pone el clip dentro de `holder` (que ya muestra la miniatura). El clip solo se
// enseña cuando YouTube confirma que se está reproduciendo; si el navegador bloquea
// la reproducción automática, se queda la imagen y nunca aparece un reproductor parado.
function startClip(holder, short, startAt) {
    stopClip(holder);
    // Del tráiler se ve casi desde el principio; de la película se salta el arranque
    // (títulos de crédito), que chocaría con el título de la portada.
    if (startAt === undefined) startAt = short.trailer ? 8 : 45;
    if (!clipsAllowed()) return;
    const id = youtubeId(short.trailer || short.movie);
    if (!id) return;
    const clip = document.createElement('div');
    clip.className = 'clip';
    clip.setAttribute('aria-hidden', 'true');
    const origin = encodeURIComponent(location.origin);
    const params = `autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&start=${startAt}&enablejsapi=1&origin=${origin}`;
    clip.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?${params}" title="Clip de ${escapeHTML(short.title)}" tabindex="-1" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
    const iframe = clip.querySelector('iframe');
    iframe.addEventListener('load', () => {
        // Pide a YouTube que avise de los cambios de estado del vídeo. El reproductor
        // tarda un poco en estar listo, así que se repite hasta que contesta.
        let tries = 0;
        const ask = setInterval(() => {
            if (clip.dataset.heard || !clip.isConnected || ++tries > 20) return clearInterval(ask);
            iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id, channel: 'widget' }), '*');
        }, 400);
    }, { once: true });
    holder.appendChild(clip);
}

// Estado de los clips: 1 = reproduciendo, 2 = en pausa, 3 = cargando. Mientras carga (también al
// volver a empezar el bucle) se oculta para no enseñar el indicador de carga. Al empezar
// se esperan 3 s, que es lo que tardan en desaparecer los botones de YouTube.
window.addEventListener('message', (event) => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(event.origin).hostname)) return;
    let data;
    try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch {
        return;
    }
    const state = data?.info?.playerState;
    if (state === undefined) return;
    const iframe = [...document.querySelectorAll('.clip iframe')].find(frame => frame.contentWindow === event.source);
    if (!iframe) return;
    const clip = iframe.parentElement;
    clip.dataset.heard = 'true';
    clearTimeout(Number(clip.dataset.timer));
    if (state === 1) clip.dataset.timer = String(setTimeout(() => clip.classList.add('is-playing'), 3000));
    else if (state === 2 || state === 3 || state === 0 || state === -1) clip.classList.remove('is-playing');
});

function stopClip(holder) {
    holder.querySelectorAll('.clip').forEach(clip => {
        clearTimeout(Number(clip.dataset.timer));
        clip.remove();
    });
}

// ---------- Tarjetas y filas ----------

function renderTile(short, favorites) {
    const meta = [short.year, cleanGenre(short.genre)].filter(Boolean).join(' · ');
    return `
        <a class="tile" href="${shortUrl(short)}">
            <span class="tile__media media" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(backdropOf(short))}" alt="" loading="lazy" onerror="handleImageError(this)">
                ${favorites?.has(short.slug) ? `<span class="tile__fav">${FAVORITE_ICON}<span class="sr-only">En tus favoritos</span></span>` : ''}
            </span>
            <span class="tile__info">
                <span class="tile__title">${escapeHTML(short.title)}</span>
                ${meta ? `<span class="tile__meta">${escapeHTML(meta)}</span>` : ''}
            </span>
        </a>`;
}

function renderRow({ id, title, sub, shorts, favorites }) {
    if (!shorts.length) return '';
    return `
        <section class="row" aria-labelledby="${id}-title">
            <div class="row__head">
                <h2 class="row__title" id="${id}-title">${escapeHTML(title)}</h2>
                ${sub ? `<p class="row__sub">${escapeHTML(sub)}</p>` : ''}
            </div>
            <div class="row__viewport">
                <button type="button" class="row__arrow row__arrow--prev" data-row="prev" aria-label="Ver anteriores" disabled>${ARROW_LEFT_ICON}</button>
                <div class="row__track" tabindex="0" role="group" aria-label="${escapeHTML(title)}">
                    ${shorts.map(short => renderTile(short, favorites)).join('')}
                </div>
                <button type="button" class="row__arrow row__arrow--next" data-row="next" aria-label="Ver siguientes">${ARROW_RIGHT_ICON}</button>
            </div>
        </section>`;
}

// Flechas y teclado de cada fila deslizable.
function mountRows(root = document) {
    root.querySelectorAll('.row').forEach(row => {
        if (row.dataset.mounted) return;
        row.dataset.mounted = 'true';
        const track = row.querySelector('.row__track');
        const prev = row.querySelector('[data-row="prev"]');
        const next = row.querySelector('[data-row="next"]');

        function update() {
            prev.disabled = track.scrollLeft <= 2;
            next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        }
        function page(direction) {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
        }
        prev.addEventListener('click', () => page(-1));
        next.addEventListener('click', () => page(1));
        track.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        track.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowRight') { event.preventDefault(); page(1); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); page(-1); }
        });
        update();
    });
}

// Imagen de fondo: el fotograma limpio (sin letras) si existe; si no, la miniatura.
function backdropOf(short) {
    return short.backdrop || short.thumbnail;
}

function shortUrl(short) {
    return `corto.html?id=${encodeURIComponent(short.slug)}`;
}

function renderLaurels(laurels, className = 'laurels') {
    if (!laurels || laurels.length === 0) return '';
    return `
        <ul class="${className}">
            ${laurels.map(l => `
                <li class="laurel">
                    <span class="laurel__type">${escapeHTML(l.type)}</span>
                    <span class="laurel__name">${escapeHTML(l.name)}</span>
                </li>`).join('')}
        </ul>`;
}

// Sustituye una imagen rota por un marcador con el título.
function handleImageError(img) {
    img.onerror = null;
    img.closest('.media')?.classList.add('media--missing');
    img.remove();
}

// Aviso flotante breve (type: 'success' | 'error' | 'info'), anunciado a lectores de pantalla.
function showToast(message, type = 'info') {
    let box = document.querySelector('.toasts');
    if (!box) {
        box = document.createElement('div');
        box.className = 'toasts';
        box.setAttribute('role', 'status');
        box.setAttribute('aria-live', 'polite');
        document.body.appendChild(box);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    box.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// Datos estructurados (schema.org) para que Google entienda la página.
// Se pueden llamar varias veces: cada id sustituye a su versión anterior.
function setStructuredData(id, data) {
    let script = document.getElementById(id);
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
}

function absoluteUrl(path) {
    return path ? new URL(path, document.baseURI).href : undefined;
}

function organizationData() {
    const sameAs = typeof SITE === 'undefined' ? [] : [SITE.youtube, SITE.instagram, SITE.tiktok, SITE.x].filter(Boolean);
    return {
        '@type': 'Organization',
        name: typeof SITE === 'undefined' ? 'PLMRN Studio' : SITE.name,
        url: absoluteUrl('index.html').replace(/index\.html$/, ''),
        logo: absoluteUrl('img/favicon.svg'),
        ...(sameAs.length ? { sameAs } : {})
    };
}

// Pie de página común a todas las páginas. Los enlaces sociales salen de js/site.js.
function renderFooter() {
    const footer = document.querySelector('.site-footer');
    if (!footer || typeof SITE === 'undefined') return;

    const social = [
        ['YouTube', SITE.youtube],
        ['Instagram', SITE.instagram],
        ['TikTok', SITE.tiktok],
        ['X', SITE.x]
    ].filter(([, url]) => url);
    const link = (href, text) => `<li><a href="${escapeHTML(href)}">${escapeHTML(text)}</a></li>`;
    const external = (href, text) => `<li><a href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(text)}</a></li>`;

    footer.innerHTML = `
        <div class="container footer">
            <div class="footer__brand">
                <a class="brand" href="index.html" aria-label="${escapeHTML(SITE.name)}, inicio">
                    <span class="brand__logo">PLMRN</span>
                    <span class="brand__badge">Studio</span>
                </a>
                <p>Cortometrajes hechos con pocos medios y muchas ganas.</p>
            </div>
            <nav class="footer__col" aria-label="Explorar">
                <h2 class="footer__title">Explorar</h2>
                <ul>
                    ${link('index.html#cortometrajes', 'Cortometrajes')}
                    ${link('index.html#guiones', 'Guiones')}
                    ${link('sobre.html', 'Sobre nosotros')}
                </ul>
            </nav>
            <nav class="footer__col" aria-label="Contacto y redes">
                <h2 class="footer__title">Contacto</h2>
                <ul>
                    ${SITE.email ? link(`mailto:${SITE.email}`, SITE.email) : link('sobre.html#contacto', 'Escríbenos')}
                    ${social.map(([name, url]) => external(url, name)).join('')}
                </ul>
            </nav>
            <nav class="footer__col" aria-label="Legal">
                <h2 class="footer__title">Legal</h2>
                <ul>
                    ${link('aviso-legal.html', 'Aviso legal')}
                    ${link('privacidad.html', 'Privacidad')}
                </ul>
            </nav>
        </div>
        <div class="container footer__bottom">
            <span>&copy; ${new Date().getFullYear()} PLMRN. Todos los derechos reservados.</span>
            <a href="#contenido" class="footer__top">Volver arriba</a>
        </div>`;
}

// Rellena los huecos <span data-site="email"> de las páginas con los datos de js/site.js.
function fillSiteData() {
    if (typeof SITE === 'undefined') return;
    document.querySelectorAll('[data-site]').forEach(el => {
        const value = SITE[el.dataset.site];
        if (el.dataset.site === 'email' && value) {
            el.innerHTML = `<a href="mailto:${escapeHTML(value)}">${escapeHTML(value)}</a>`;
        } else {
            el.textContent = value || el.dataset.fallback || '';
        }
    });
    // Oculta las líneas opcionales cuyo dato está vacío.
    document.querySelectorAll('[data-site-optional]').forEach(el => {
        el.hidden = !SITE[el.dataset.siteOptional];
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderFooter();
    setupSearchShortcut();
    fillSiteData();
    setupBackToTop();
});

// Flecha flotante que aparece al bajar y devuelve al inicio de la página.
function setupBackToTop() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'to-top';
    button.setAttribute('aria-label', 'Volver arriba');
    button.hidden = true;
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(button);

    let ticking = false;
    function update() {
        ticking = false;
        const show = window.scrollY > 600;
        if (show && button.hidden) {
            button.hidden = false;
            requestAnimationFrame(() => button.classList.add('is-visible'));
        } else if (!show && !button.hidden) {
            button.classList.remove('is-visible');
            button.hidden = true;
        }
    }
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });

    button.addEventListener('click', () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    update();
}

// El icono de búsqueda de la cabecera lleva al catálogo y deja el cursor en el buscador.
function setupSearchShortcut() {
    const input = document.getElementById('shorts-search');
    if (!input) return;
    document.querySelectorAll('[data-focus-search]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            document.getElementById('cortometrajes').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
            input.focus({ preventScroll: true });
        });
    });
}
