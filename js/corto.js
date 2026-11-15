// Ficha individual de un cortometraje: corto.html?id=<slug>

const CAROUSEL_ARROW_LEFT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>';
const CAROUSEL_ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

// Flechas del carrusel: desplazan la fila de un lado a otro.
function mountCarousel(root) {
    const carousel = root.querySelector('.carousel');
    if (!carousel) return;
    const prev = root.querySelector('[data-carousel="prev"]');
    const next = root.querySelector('[data-carousel="next"]');

    function update() {
        prev.disabled = carousel.scrollLeft <= 2;
        next.disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;
    }
    function scrollByPage(direction) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        carousel.scrollBy({ left: direction * carousel.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
    }

    prev.addEventListener('click', () => scrollByPage(-1));
    next.addEventListener('click', () => scrollByPage(1));
    carousel.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    carousel.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); scrollByPage(1); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); scrollByPage(-1); }
    });
    update();
}

// Ficha del corto para Google (schema.org/Movie). Si hay votos, se añade la media.
function addShortStructuredData(short, rating) {
    const genres = (short.genre || '').split('/').map(g => g.trim().replace(/\.+$/, '')).filter(Boolean);
    const awards = (short.laurels || []).map(l => [l.type, l.name].filter(Boolean).join(': '));
    const youtube = short.movie || short.trailer;

    setStructuredData('ld-short', {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: short.title,
        url: absoluteUrl(shortUrl(short)),
        image: absoluteUrl(short.poster || short.thumbnail),
        inLanguage: 'es',
        ...(short.synopsis ? { description: short.synopsis } : {}),
        ...(short.year ? { dateCreated: String(short.year) } : {}),
        ...(genres.length ? { genre: genres } : {}),
        ...(awards.length ? { award: awards } : {}),
        ...(youtube ? { sameAs: youtube } : {}),
        productionCompany: organizationData(),
        ...(rating && rating.votes ? {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: rating.average,
                ratingCount: rating.votes,
                bestRating: 5,
                worstRating: 1
            }
        } : {})
    });
}

// ---------- Compartir ----------

const SHARE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

function renderShareButton() {
    return `
        <div class="share">
            <button type="button" class="btn btn--ghost share__button" data-share aria-haspopup="true" aria-expanded="false" aria-controls="share-menu">
                ${SHARE_ICON}<span>Compartir</span>
            </button>
            <div class="share__menu" id="share-menu" hidden>
                <button type="button" class="share__item" data-share-copy>Copiar enlace</button>
                <a class="share__item" data-share-to="whatsapp" target="_blank" rel="noopener">WhatsApp</a>
                <a class="share__item" data-share-to="x" target="_blank" rel="noopener">X (Twitter)</a>
                <a class="share__item" data-share-to="facebook" target="_blank" rel="noopener">Facebook</a>
                <a class="share__item" data-share-to="telegram" target="_blank" rel="noopener">Telegram</a>
                <a class="share__item" data-share-to="email">Correo</a>
            </div>
        </div>`;
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Navegadores antiguos o sin permiso: se copia con un campo temporal.
        const field = document.createElement('textarea');
        field.value = text;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand('copy');
        field.remove();
        return ok;
    }
}

// En el móvil abre el menú de compartir del sistema; en el ordenador, un menú propio.
function mountShare(root, short) {
    const box = root.querySelector('.share');
    if (!box) return;
    const button = box.querySelector('[data-share]');
    const menu = box.querySelector('.share__menu');
    const url = absoluteUrl(shortUrl(short));
    const title = `${short.title} · PLMRN`;
    const text = `Mira «${short.title}», un cortometraje de PLMRN`;
    const enc = encodeURIComponent;

    const targets = {
        whatsapp: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
        x: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
        telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`,
        email: `mailto:?subject=${enc(title)}&body=${enc(`${text}:\n${url}`)}`
    };
    menu.querySelectorAll('[data-share-to]').forEach(link => { link.href = targets[link.dataset.shareTo]; });

    function setOpen(open) {
        menu.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        if (open) menu.querySelector('.share__item').focus();
    }

    button.addEventListener('click', async () => {
        const touch = window.matchMedia('(pointer: coarse)').matches;
        if (touch && navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return; // lo cerró el usuario
            }
        }
        setOpen(menu.hidden);
    });

    menu.addEventListener('click', async (event) => {
        const item = event.target.closest('.share__item');
        if (!item) return;
        if (item.matches('[data-share-copy]')) {
            showToast(await copyText(url) ? 'Enlace copiado.' : 'No se ha podido copiar el enlace.', 'info');
        }
        setOpen(false);
        button.focus();
    });

    document.addEventListener('click', (event) => {
        if (!menu.hidden && !box.contains(event.target)) setOpen(false);
    });
    box.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !menu.hidden) {
            setOpen(false);
            button.focus();
        }
    });
}

function renderVideo(title, label, badge, url) {
    const embed = toYouTubeEmbed(url);
    if (!embed) return '';
    return `
        <section class="panel">
            <div class="panel__head">
                <h2 class="panel__title">${title}</h2>
                <span class="pill">${badge}</span>
            </div>
            <div class="video">
                <iframe src="${embed}" title="${escapeHTML(label)}" loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen></iframe>
            </div>
        </section>`;
}

function renderNotFound(root) {
    document.title = 'Corto no encontrado · PLMRN';
    root.innerHTML = `
        <div class="empty">
            <h1>Corto no encontrado</h1>
            <p>El cortometraje que buscas no existe o ha cambiado de dirección.</p>
            <a class="btn" href="index.html">Volver al catálogo</a>
        </div>`;
}

function renderShort(root, short, index, shorts) {
    document.title = `${short.title} · PLMRN`;
    document.querySelector('meta[name="description"]')
        ?.setAttribute('content', short.synopsis || `Cortometraje ${short.title} de PLMRN.`);

    const poster = short.poster || short.thumbnail;
    const prev = shorts[(index - 1 + shorts.length) % shorts.length];
    const next = shorts[(index + 1) % shorts.length];
    const others = shorts.filter(s => s !== short);

    const meta = [short.year, cleanGenre(short.genre)].filter(Boolean);

    root.innerHTML = `
        <section class="feature" aria-labelledby="detail-title">
            <div class="feature__media media" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(backdropOf(short) || poster)}" alt="" fetchpriority="high" onerror="handleImageError(this)">
            </div>
            <div class="feature__shade" aria-hidden="true"></div>
            <div class="feature__inner container">
                <a class="back" href="index.html">${ARROW_LEFT_ICON} Volver al catálogo</a>
                <div class="feature__grid">
                    <div class="detail__info">
                        <h1 class="detail__title" id="detail-title">${escapeHTML(short.title)}</h1>
                        <p class="hero__meta detail__meta">
                            ${meta.map(item => `<span>${escapeHTML(item)}</span>`).join('')}
                            ${RATINGS_ENABLED ? `<span class="hero__rating" data-hero-rating="${escapeHTML(short.slug)}" hidden></span>` : ''}
                            ${short.laurels?.length ? `<span>${short.laurels.length === 1 ? '1 selección en festivales' : `${short.laurels.length} selecciones en festivales`}</span>` : ''}
                        </p>
                        <div class="detail__actions">
                            ${short.movie ? `<a class="btn btn--light" href="#ver-corto">${PLAY_ICON}Ver ahora</a>` : ''}
                            ${short.trailer ? `<a class="btn btn--glass" href="#trailer">Ver tráiler</a>` : ''}
                            ${renderFavoriteButton(short)}
                            ${renderShareButton()}
                        </div>
                    </div>
                    <div class="feature__poster media media--poster ${short.poster ? '' : 'media--fit'}" data-title="${escapeHTML(short.title)}">
                        <img src="${escapeHTML(poster)}" alt="Póster de ${escapeHTML(short.title)}" onerror="handleImageError(this)">
                    </div>
                </div>
            </div>
        </section>

        <div class="container short-body">
            <section class="record" aria-label="Sinopsis, valoración y festivales">
                <div class="panel-box record__story">
                    <h2 class="label">Sinopsis</h2>
                    <p class="detail__synopsis">${escapeHTML(short.synopsis || 'Sinopsis próximamente.')}</p>
                    ${renderRater(short)}
                </div>
                <div class="panel-box record__laurels">
                    <h2 class="label">Festivales y palmarés</h2>
                    ${renderLaurels(short.laurels) || '<p class="muted">Sin selecciones de festivales registradas.</p>'}
                </div>
            </section>

            <div id="trailer">${renderVideo('Tráiler', `Tráiler de ${short.title}`, 'Avance oficial', short.trailer)}</div>
            <div id="ver-corto">${renderVideo('Cortometraje completo', short.title, 'Película completa', short.movie)}</div>

            ${renderCommentsSection()}

            ${shorts.length > 1 ? `
            <nav class="pager" aria-label="Otros cortos">
                <a href="${shortUrl(prev)}">
                    <span class="pager__media media" data-title="${escapeHTML(prev.title)}"><img src="${escapeHTML(prev.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)"></span>
                    <span class="pager__text"><small>${ARROW_LEFT_ICON} Anterior</small>${escapeHTML(prev.title)}</span>
                </a>
                <a href="${shortUrl(next)}" class="pager__next">
                    <span class="pager__media media" data-title="${escapeHTML(next.title)}"><img src="${escapeHTML(next.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)"></span>
                    <span class="pager__text"><small>Siguiente ${ARROW_RIGHT_ICON}</small>${escapeHTML(next.title)}</span>
                </a>
            </nav>` : ''}
        </div>

        ${others.length ? `<div class="rows rows--detail">${renderRow({ id: 'mas-cortos', title: 'Más cortometrajes', sub: 'Sigue viendo', shorts: others })}</div>` : ''}
    `;
}

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('contenido');
    const slug = new URLSearchParams(location.search).get('id');
    root.setAttribute('aria-busy', 'true');
    root.innerHTML = '<p class="muted page-loading">Cargando el cortometraje…</p>';

    const shorts = await loadShorts();
    const index = shorts.findIndex(s => s.slug === slug);
    root.removeAttribute('aria-busy');

    if (index === -1) renderNotFound(root);
    else {
        const short = shorts[index];
        renderShort(root, short, index, shorts);
        mountRater(root);
        mountFavoriteButton(root);
        mountShare(root, short);
        mountComments(root, short.slug);
        mountRows(root);
        startClip(root.querySelector('.feature__media'), short);

        addShortStructuredData(short);
        getAllRatings()
            .then(ratings => {
                const rating = ratings.get(short.slug);
                const slot = root.querySelector('[data-hero-rating]');
                if (slot && rating && rating.votes) {
                    slot.innerHTML = `${STAR_ICON}${ratingFormat.format(rating.average)}`;
                    slot.hidden = false;
                }
                addShortStructuredData(short, rating);
            })
            .catch(() => {});
    }
    if (typeof animateContent === 'function') animateContent(root);
});
