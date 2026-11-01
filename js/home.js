// Página de inicio: pinta todas las tarjetas de cortos y guiones.

function renderShortCard(short) {
    const meta = [short.genre, short.year].filter(Boolean).join(' · ');
    return `
        <a class="card" href="${shortUrl(short)}">
            <div class="media media--video" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(short.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)">
                <span class="tag tag--red">Cortometraje</span>
                ${short.movie ? '<span class="play" aria-hidden="true">▶</span>' : ''}
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
                <span class="tag tag--amber">Guion literario</span>
            </div>
            <div class="card__body">
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('shorts-grid').innerHTML = SHORTS.map(renderShortCard).join('');
    document.getElementById('shorts-count').textContent = SHORTS.length;
    fillCardRatings();

    const scriptsGrid = document.getElementById('scripts-grid');
    if (SCRIPTS.length) {
        scriptsGrid.innerHTML = SCRIPTS.map(renderScriptCard).join('');
    } else {
        document.getElementById('guiones').hidden = true;
    }

    setupScrollSpy();
});
