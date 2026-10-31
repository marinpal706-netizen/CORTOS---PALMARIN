// Ficha individual de un cortometraje: corto.html?id=<slug>

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

function renderShort(root, short, index) {
    document.title = `${short.title} · PLMRN`;
    document.querySelector('meta[name="description"]')
        ?.setAttribute('content', short.synopsis || `Cortometraje ${short.title} de PLMRN.`);

    const poster = short.poster || short.thumbnail;
    const meta = [short.genre, short.year].filter(Boolean).join(' · ');
    const prev = SHORTS[(index - 1 + SHORTS.length) % SHORTS.length];
    const next = SHORTS[(index + 1) % SHORTS.length];
    const others = SHORTS.filter(s => s !== short);

    root.innerHTML = `
        <div class="backdrop" style="background-image:url('${escapeHTML(short.thumbnail)}')" aria-hidden="true"></div>

        <a class="back" href="index.html">
            <span aria-hidden="true">←</span> Volver al catálogo
        </a>

        <section class="panel detail">
            <div class="media media--poster ${short.poster ? '' : 'media--fit'}" data-title="${escapeHTML(short.title)}">
                <img src="${escapeHTML(poster)}" alt="Póster de ${escapeHTML(short.title)}" onerror="handleImageError(this)">
            </div>
            <div class="detail__info">
                <span class="tag tag--red tag--inline">Cortometraje oficial</span>
                <h1 class="detail__title">${escapeHTML(short.title)}</h1>
                ${meta ? `<p class="detail__meta">${escapeHTML(meta)}</p>` : ''}

                <div class="detail__actions">
                    ${short.movie ? '<a class="btn" href="#ver-corto">▶ Ver el corto</a>' : ''}
                    ${short.trailer ? '<a class="btn btn--ghost" href="#trailer">Ver tráiler</a>' : ''}
                </div>

                <h2 class="label">Sinopsis</h2>
                <p class="detail__synopsis">${escapeHTML(short.synopsis || 'Sinopsis próximamente.')}</p>

                <h2 class="label label--amber"><span aria-hidden="true">★</span> Festivales y palmarés</h2>
                ${renderLaurels(short.laurels) || '<p class="muted">Sin selecciones de festivales registradas.</p>'}
            </div>
        </section>

        <div id="trailer">${renderVideo('<span class="accent">▶</span> Tráiler', `Tráiler de ${short.title}`, 'Avance oficial', short.trailer)}</div>
        <div id="ver-corto">${renderVideo('<span class="accent">🎬</span> Cortometraje completo', short.title, 'Película completa', short.movie)}</div>

        ${SHORTS.length > 1 ? `
        <nav class="pager" aria-label="Otros cortos">
            <a href="${shortUrl(prev)}"><small>← Anterior</small>${escapeHTML(prev.title)}</a>
            <a href="${shortUrl(next)}" class="pager__next"><small>Siguiente →</small>${escapeHTML(next.title)}</a>
        </nav>

        <section>
            <h2 class="section-title">Más cortometrajes</h2>
            <div class="mini-grid">
                ${others.map(s => `
                    <a class="mini" href="${shortUrl(s)}">
                        <div class="media media--video" data-title="${escapeHTML(s.title)}">
                            <img src="${escapeHTML(s.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)">
                        </div>
                        <span>${escapeHTML(s.title)}</span>
                    </a>`).join('')}
            </div>
        </section>` : ''}
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('short-root');
    const slug = new URLSearchParams(location.search).get('id');
    const index = SHORTS.findIndex(s => s.slug === slug);

    if (index === -1) renderNotFound(root);
    else renderShort(root, SHORTS[index], index);
});
