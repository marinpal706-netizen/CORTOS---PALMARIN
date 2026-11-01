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

// Filtro por título y por género. Los géneros salen de data.js automáticamente.
function setupFilters() {
    const search = document.getElementById('shorts-search');
    const chipsBox = document.getElementById('shorts-genres');
    const grid = document.getElementById('shorts-grid');
    const empty = document.getElementById('shorts-empty');
    const count = document.getElementById('shorts-count');
    const normalize = text => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const genres = [...new Set(SHORTS.map(s => s.genre).filter(Boolean))];
    let activeGenre = '';

    function renderChips() {
        const all = ['', ...genres];
        chipsBox.innerHTML = all.map(genre => `
            <button type="button" class="chip${genre === activeGenre ? ' is-active' : ''}" data-genre="${escapeHTML(genre)}" aria-pressed="${genre === activeGenre}">${genre ? escapeHTML(genre) : 'Todos'}</button>`).join('');
    }

    function apply() {
        const query = normalize(search.value.trim());
        const visible = SHORTS.filter(s =>
            (!activeGenre || s.genre === activeGenre) && (!query || normalize(s.title).includes(query)));
        grid.innerHTML = visible.map(renderShortCard).join('');
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
    apply();
}

document.addEventListener('DOMContentLoaded', () => {
    setupFilters();

    const scriptsGrid = document.getElementById('scripts-grid');
    if (SCRIPTS.length) {
        scriptsGrid.innerHTML = SCRIPTS.map(renderScriptCard).join('');
    } else {
        document.getElementById('guiones').hidden = true;
    }

    setupScrollSpy();
});
