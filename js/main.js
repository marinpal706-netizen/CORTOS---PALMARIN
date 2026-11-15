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
                <p>Cortometrajes de terror y suspense hechos con pocos medios y muchas ganas.</p>
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
}

document.addEventListener('DOMContentLoaded', () => {
    renderFooter();
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
