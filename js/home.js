// Página de inicio: carrusel destacado con clips, filas por género y catálogo completo.

const HERO_COUNT = 5;
const HERO_INTERVAL_MS = 10000;

function renderShortCard(short, favorites) {
    const meta = [short.year, cleanGenre(short.genre)].filter(Boolean).join(' · ');
    return `
        <a class="card" href="${shortUrl(short)}">
            <span class="card__media media media--video" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(short.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)">
                ${favorites?.has(short.slug) ? `<span class="tile__fav">${FAVORITE_ICON}<span class="sr-only">En tus favoritos</span></span>` : ''}
                <span class="card__play" aria-hidden="true">${PLAY_ICON}</span>
            </span>
            <span class="card__body">
                <h3 class="card__title">${escapeHTML(short.title)}</h3>
                ${meta ? `<span class="card__meta">${escapeHTML(meta)}</span>` : ''}
                ${renderCardRatingSlot(short)}
                <span class="card__text">${escapeHTML(short.synopsis || 'Sinopsis próximamente.')}</span>
                ${renderLaurels(short.laurels, 'laurels laurels--compact')}
            </span>
        </a>`;
}

function renderScriptCard(script) {
    return `
        <article class="card card--static">
            <div class="card__media media media--script" data-title="${escapeHTML(script.title)}">
                <img src="${escapeHTML(script.poster)}" alt="Portada de ${escapeHTML(script.title)}" loading="lazy" onerror="handleImageError(this)">
            </div>
            <div class="card__body">
                <h3 class="card__title">${escapeHTML(script.title)}</h3>
                <span class="card__meta">Guion literario</span>
                <p class="card__text">${escapeHTML(script.synopsis || 'Sinopsis próximamente.')}</p>
                ${renderLaurels(script.laurels, 'laurels laurels--compact')}
            </div>
        </article>`;
}

// ---------- Carrusel destacado ----------

function setupHero(shorts) {
    const hero = document.getElementById('destacados');
    const picks = shorts.slice(0, HERO_COUNT);
    if (!hero || !picks.length) return;

    const slidesBox = hero.querySelector('.hero__slides');
    const dotsBox = hero.querySelector('.hero__dots');
    const pauseButton = hero.querySelector('.hero__pause');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    slidesBox.innerHTML = picks.map((short, index) => {
        const meta = [short.year, cleanGenre(short.genre)].filter(Boolean);
        const watch = short.movie
            ? `<a class="btn btn--light" href="${shortUrl(short)}#ver-corto">${PLAY_ICON}Ver ahora</a>`
            : short.trailer ? `<a class="btn btn--light" href="${shortUrl(short)}#trailer">${PLAY_ICON}Ver tráiler</a>` : '';
        return `
            <article class="hero__slide" data-index="${index}" aria-roledescription="diapositiva" aria-label="${index + 1} de ${picks.length}: ${escapeHTML(short.title)}">
                <div class="hero__media media" data-title="${escapeHTML(short.title)}">
                    <img src="${escapeHTML(backdropOf(short))}" alt="" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} onerror="handleImageError(this)">
                </div>
                <div class="hero__shade" aria-hidden="true"></div>
                <div class="hero__content">
                    <h2 class="hero__title">${escapeHTML(short.title)}</h2>
                    <p class="hero__meta">
                        ${meta.map(item => `<span>${escapeHTML(item)}</span>`).join('')}
                        ${RATINGS_ENABLED ? `<span class="hero__rating" data-hero-rating="${escapeHTML(short.slug)}" hidden></span>` : ''}
                    </p>
                    ${short.synopsis ? `<p class="hero__text">${escapeHTML(short.synopsis)}</p>` : ''}
                    <div class="hero__actions">
                        ${watch}
                        <a class="btn btn--glass" href="${shortUrl(short)}">${INFO_ICON}Más información</a>
                    </div>
                </div>
            </article>`;
    }).join('');

    dotsBox.innerHTML = picks.map((short, index) => `
        <button type="button" class="hero__dot" data-index="${index}" aria-label="Ver ${escapeHTML(short.title)}"></button>`).join('');

    const slides = [...slidesBox.querySelectorAll('.hero__slide')];
    const dots = [...dotsBox.querySelectorAll('.hero__dot')];
    let current = -1;
    let timer = null;
    let paused = reduce;
    let holding = false; // ratón encima o foco dentro

    function show(index) {
        index = (index + picks.length) % picks.length;
        if (index === current) return;
        if (current >= 0) stopClip(slides[current].querySelector('.hero__media'));
        current = index;
        slides.forEach((slide, i) => {
            const active = i === index;
            slide.classList.toggle('is-active', active);
            slide.inert = !active;
            slide.setAttribute('aria-hidden', String(!active));
        });
        dots.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
        startClip(slides[index].querySelector('.hero__media'), picks[index]);
        schedule();
    }

    function schedule() {
        clearTimeout(timer);
        if (paused || holding || picks.length < 2) return;
        timer = setTimeout(() => show(current + 1), HERO_INTERVAL_MS);
    }

    function setPaused(value) {
        paused = value;
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('aria-label', paused ? 'Reanudar el carrusel' : 'Pausar el carrusel');
        schedule();
    }

    hero.querySelector('.hero__arrow--prev').addEventListener('click', () => show(current - 1));
    hero.querySelector('.hero__arrow--next').addEventListener('click', () => show(current + 1));
    dotsBox.addEventListener('click', (event) => {
        const dot = event.target.closest('[data-index]');
        if (dot) show(Number(dot.dataset.index));
    });
    pauseButton.addEventListener('click', () => setPaused(!paused));

    hero.addEventListener('pointerenter', () => { holding = true; schedule(); });
    hero.addEventListener('pointerleave', () => { holding = false; schedule(); });
    hero.addEventListener('focusin', () => { holding = true; schedule(); });
    hero.addEventListener('focusout', (event) => {
        if (!hero.contains(event.relatedTarget)) { holding = false; schedule(); }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearTimeout(timer);
        else schedule();
    });

    // Deslizar con el dedo en el móvil.
    let startX = null;
    hero.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'mouse') startX = event.clientX; });
    hero.addEventListener('pointerup', (event) => {
        if (startX === null) return;
        const dx = event.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    });

    if (picks.length < 2) hero.classList.add('hero--single');
    pauseButton.setAttribute('aria-pressed', String(paused));
    hero.hidden = false;
    show(0);

    // Valoración media en cada diapositiva, cuando llega.
    if (RATINGS_ENABLED) {
        getAllRatings().then(ratings => {
            hero.querySelectorAll('[data-hero-rating]').forEach(slot => {
                const rating = ratings.get(slot.dataset.heroRating);
                if (!rating || !rating.votes) return;
                slot.innerHTML = `${STAR_ICON}${ratingFormat.format(rating.average)}`;
                slot.hidden = false;
            });
        }).catch(() => {});
    }
}

// ---------- Filas ----------

function renderRows(shorts, scripts, favorites = new Set()) {
    const box = document.getElementById('filas');
    if (!box) return;
    const groups = new Map(GENRE_ROWS.map(row => [row.key, []]));
    shorts.forEach(short => {
        const key = genreKey(short.genre);
        if (key) groups.get(key).push(short);
    });

    const rows = [
        { id: 'fila-recientes', title: 'Recién llegados', sub: 'Lo último del estudio', shorts: shorts.slice(0, 12) },
        { id: 'fila-valorados', title: 'Los más valorados', sub: 'Elegidos por quienes los han visto', shorts: [] },
        ...GENRE_ROWS.map(row => ({ id: `fila-${row.key}`, title: row.title, sub: row.sub, shorts: groups.get(row.key) }))
    ];
    box.innerHTML = rows.map(row => `<div data-row-slot="${row.id}">${renderRow({ ...row, favorites })}</div>`).join('');
    mountRows(box);

    // Los más valorados se rellenan cuando llegan las valoraciones.
    if (RATINGS_ENABLED) {
        getAllRatings().then(ratings => {
            const rated = shorts
                .filter(s => ratings.get(s.slug)?.votes)
                .sort((a, b) => ratings.get(b.slug).average - ratings.get(a.slug).average
                    || ratings.get(b.slug).votes - ratings.get(a.slug).votes)
                .slice(0, 12);
            if (rated.length < 3) return;
            const slot = box.querySelector('[data-row-slot="fila-valorados"]');
            slot.innerHTML = renderRow({ id: 'fila-valorados', title: 'Los más valorados', sub: 'Elegidos por quienes los han visto', shorts: rated, favorites });
            mountRows(slot);
        }).catch(() => {});
    }
}

// Resalta en el menú la sección que se está viendo.
function setupScrollSpy() {
    const links = [...document.querySelectorAll('.nav a[href^="#"]')];
    const sections = links.map(link => document.querySelector(link.hash)).filter(s => s && !s.hidden);
    if (sections.length < 2) return;

    let ticking = false;

    function update() {
        ticking = false;
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        let current = sections[0];
        sections.forEach(section => {
            if (section.getBoundingClientRect().top <= window.innerHeight * 0.4) current = section;
        });
        if (atBottom) current = sections[sections.length - 1];

        links.forEach(link => {
            const active = link.hash === `#${current.id}`;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });
    update();
}

// Tarjetas vacías mientras llegan los cortos (evita que la página salte).
function renderShortsLoading(grid) {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = Array.from({ length: 3 }, () => `
        <div class="card card--skeleton" aria-hidden="true">
            <div class="card__media media media--video"></div>
            <div class="card__body">
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line skeleton-line--short"></span>
            </div>
        </div>`).join('');
    document.getElementById('shorts-count').textContent = '…';
}

// Filtro por título y por género. Los géneros salen de los propios cortos.
// Devuelve una promesa que termina cuando se han pintado las tarjetas.
function setupFilters(shorts, onFavorites) {
    const search = document.getElementById('shorts-search');
    const chipsBox = document.getElementById('shorts-genres');
    const grid = document.getElementById('shorts-grid');
    const empty = document.getElementById('shorts-empty');
    const count = document.getElementById('shorts-count');
    const sort = document.getElementById('shorts-sort');
    // Sin valoraciones (Supabase sin configurar) solo se ofrece el orden por fecha y título.
    if (!RATINGS_ENABLED) sort.querySelectorAll('[value="rating"], [value="votes"]').forEach(o => o.remove());
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // "Thriller psicológico / Suspense." cuenta como dos géneros: Thriller psicológico y Suspense.
    const genresOf = short => (short.genre || '')
        .split('/')
        .map(g => g.trim().replace(/\.+$/, ''))
        .filter(Boolean);
    const genres = [...new Set(shorts.flatMap(genresOf))];
    let activeGenre = '';

    function renderChips() {
        const all = ['', ...genres];
        chipsBox.innerHTML = all.map(genre => `
            <button type="button" class="chip${genre === activeGenre ? ' is-active' : ''}" data-genre="${escapeHTML(genre)}" aria-pressed="${genre === activeGenre}">${genre ? escapeHTML(genre) : 'Todos'}</button>`).join('');
    }

    // "Más recientes" respeta el orden del panel (los cortos nuevos van arriba).
    const byTitle = (a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    async function sortShorts(list) {
        if (sort.value === 'title') return list.sort(byTitle);
        if (sort.value !== 'rating' && sort.value !== 'votes') return list;

        let ratings;
        try {
            ratings = await getAllRatings();
        } catch {
            return list;
        }
        const avg = s => ratings.get(s.slug)?.average || 0;
        const votes = s => ratings.get(s.slug)?.votes || 0;
        return list.sort(sort.value === 'rating'
            ? (a, b) => avg(b) - avg(a) || votes(b) - votes(a)
            : (a, b) => votes(b) - votes(a) || avg(b) - avg(a));
    }

    // "Mis favoritos": solo aparece con la sesión iniciada.
    const favButton = document.getElementById('shorts-favs');
    let favorites = new Set();
    let onlyFavorites = false;

    function paintFavButton() {
        favButton.classList.toggle('is-active', onlyFavorites);
        favButton.setAttribute('aria-pressed', String(onlyFavorites));
    }

    let applyRun = 0;
    async function apply() {
        const run = ++applyRun;
        const query = normalize(search.value.trim());
        const filtered = shorts.filter(s =>
            (!activeGenre || genresOf(s).includes(activeGenre))
            && (!query || normalize(s.title).includes(query))
            && (!onlyFavorites || favorites.has(s.slug)));
        const visible = await sortShorts([...filtered]);
        if (run !== applyRun) return; // otra búsqueda más reciente ya ha pintado
        grid.innerHTML = visible.map(s => renderShortCard(s, favorites)).join('');
        grid.removeAttribute('aria-busy');
        count.textContent = visible.length;
        empty.textContent = onlyFavorites && !favorites.size
            ? 'Todavía no tienes favoritos. Abre un corto y pulsa «Añadir a favoritos».'
            : 'Ningún cortometraje coincide con tu búsqueda.';
        empty.hidden = visible.length > 0;
        fillCardRatings();
    }

    if (genres.length < 2) chipsBox.hidden = true;
    else renderChips();

    if (FAVORITES_ENABLED && favButton) {
        favButton.addEventListener('click', () => {
            onlyFavorites = !onlyFavorites;
            paintFavButton();
            apply();
        });
        onAuthChange(async (user) => {
            favButton.hidden = !user;
            if (!user) {
                favorites = new Set();
                onlyFavorites = false;
                paintFavButton();
            } else {
                try {
                    favorites = await loadMyFavorites();
                } catch (error) {
                    console.warn('[PLMRN] No se pudieron cargar los favoritos:', error);
                    favorites = new Set();
                }
                if (getCurrentUser()?.id !== user.id) return;
            }
            onFavorites?.(favorites);
            apply();
        });
    }

    chipsBox.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-genre]');
        if (!chip) return;
        activeGenre = chip.dataset.genre;
        renderChips();
        apply();
    });
    search.addEventListener('input', apply);
    sort.addEventListener('change', apply);
    return apply();
}

// Datos para Google: el estudio, la web y la lista de cortos.
function addHomeStructuredData(shorts) {
    const organization = organizationData();
    setStructuredData('ld-home', {
        '@context': 'https://schema.org',
        '@graph': [
            { ...organization, '@id': `${organization.url}#estudio` },
            {
                '@type': 'WebSite',
                name: organization.name,
                url: organization.url,
                inLanguage: 'es',
                publisher: { '@id': `${organization.url}#estudio` }
            },
            {
                '@type': 'ItemList',
                name: 'Cortometrajes',
                itemListElement: shorts.map((short, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: absoluteUrl(shortUrl(short)),
                    name: short.title
                }))
            }
        ]
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const scriptsGrid = document.getElementById('scripts-grid');
    if (SCRIPTS.length) {
        scriptsGrid.innerHTML = SCRIPTS.map(renderScriptCard).join('');
    } else {
        document.getElementById('guiones').hidden = true;
    }

    const grid = document.getElementById('shorts-grid');
    renderShortsLoading(grid);
    const shorts = await loadShorts();
    setupHero(shorts);
    renderRows(shorts, SCRIPTS);
    // Con sesión iniciada, las filas marcan los favoritos con un corazón.
    await setupFilters(shorts, favorites => renderRows(shorts, SCRIPTS, favorites));
    addHomeStructuredData(shorts);
    setupScrollSpy();
    if (typeof animateContent === 'function') animateContent(document.getElementById('contenido'));
});
