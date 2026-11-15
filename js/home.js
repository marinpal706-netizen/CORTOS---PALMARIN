// Página de inicio: pinta todas las tarjetas de cortos y guiones.

function renderShortCard(short) {
    const meta = [short.genre, short.year].filter(Boolean).join(' · ');
    return `
        <a class="card" href="${shortUrl(short)}">
            <div class="media media--video" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(short.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)">
            </div>
            <div class="card__body">
                <h3 class="card__title">${escapeHTML(short.title)}</h3>
                ${meta ? `<p class="card__meta">${escapeHTML(meta)}</p>` : ''}
                ${renderCardRatingSlot(short)}
                <p class="card__text">${escapeHTML(short.synopsis || 'Sinopsis próximamente.')}</p>
                ${renderLaurels(short.laurels, 'laurels laurels--compact')}
                <span class="card__cta">Ver ficha <span aria-hidden="true">→</span></span>
            </div>
        </a>`;
}

function renderScriptCard(script) {
    return `
        <article class="card card--static">
            <div class="media media--script" data-title="${escapeHTML(script.title)}">
                <img src="${escapeHTML(script.poster)}" alt="Portada de ${escapeHTML(script.title)}" loading="lazy" onerror="handleImageError(this)">
            </div>
            <div class="card__body">
                <p class="card__meta">Guion literario</p>
                <h3 class="card__title">${escapeHTML(script.title)}</h3>
                <p class="card__text">${escapeHTML(script.synopsis || 'Sinopsis próximamente.')}</p>
                ${renderLaurels(script.laurels, 'laurels laurels--compact')}
            </div>
        </article>`;
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
        // La sección activa es la última cuyo inicio ya pasó el 40% de la pantalla
        // (o la última de todas si se ha llegado al final de la página).
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

// Tarjetas grises mientras llegan los cortos (evita que la página salte).
function renderShortsLoading(grid) {
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = Array.from({ length: 3 }, () => `
        <div class="card card--skeleton" aria-hidden="true">
            <div class="media media--video"></div>
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
function setupFilters(shorts) {
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

    let applyRun = 0;
    async function apply() {
        const run = ++applyRun;
        const query = normalize(search.value.trim());
        const filtered = shorts.filter(s =>
            (!activeGenre || genresOf(s).includes(activeGenre)) && (!query || normalize(s.title).includes(query)));
        const visible = await sortShorts(filtered);
        if (run !== applyRun) return; // otra búsqueda más reciente ya ha pintado
        grid.innerHTML = visible.map(renderShortCard).join('');
        grid.removeAttribute('aria-busy');
        count.textContent = visible.length;
        empty.hidden = visible.length > 0;
        fillCardRatings();
    }

    if (genres.length < 2) chipsBox.hidden = true;
    else renderChips();

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
    await setupFilters(shorts);
    addHomeStructuredData(shorts);
    setupScrollSpy();
    if (typeof animateContent === 'function') animateContent(grid);
});
