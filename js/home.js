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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('shorts-grid').innerHTML = SHORTS.map(renderShortCard).join('');
    document.getElementById('shorts-count').textContent = SHORTS.length;

    const scriptsGrid = document.getElementById('scripts-grid');
    if (SCRIPTS.length) {
        scriptsGrid.innerHTML = SCRIPTS.map(renderScriptCard).join('');
    } else {
        document.getElementById('guiones').hidden = true;
    }
});
