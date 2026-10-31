// Animaciones de página: aparición al hacer scroll, fundido de imágenes
// y transición al cambiar de página. Debe cargarse después de home.js / corto.js.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Elementos que aparecen al entrar en pantalla.
const REVEAL_SELECTOR = '.section-head, .card, .panel:not(.detail), .pager a, .section-title, .mini';
const STAGGER = 0.08;   // segundos entre elementos hermanos
const MAX_DELAY = 0.4;

function setupReveal() {
    const elements = document.querySelectorAll(REVEAL_SELECTOR);
    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('is-visible');
            observer.unobserve(el);

            // Al terminar, se quitan las clases para que el hover use su transición normal.
            const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
            setTimeout(() => {
                el.classList.remove('reveal', 'is-visible');
                el.style.removeProperty('--delay');
            }, (delay + 0.9) * 1000);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => {
        const siblings = [...el.parentElement.children].filter(c => c.matches(REVEAL_SELECTOR));
        const delay = Math.min(siblings.indexOf(el) * STAGGER, MAX_DELAY);
        el.style.setProperty('--delay', `${delay}s`);
        el.classList.add('reveal');
    });

    // Fuerza a aplicar el estado inicial antes de observar, para que la transición se vea.
    document.body.offsetHeight;
    elements.forEach(el => observer.observe(el));
}

// Las imágenes aparecen con un fundido cuando terminan de cargar.
function setupImageFade() {
    document.querySelectorAll('.media img').forEach(img => {
        if (img.complete) return;
        img.classList.add('is-loading');
        const show = () => img.classList.remove('is-loading');
        img.addEventListener('load', show, { once: true });
        img.addEventListener('error', show, { once: true });
    });
}

// Fundido de salida al ir a otra página del sitio, solo en navegadores
// sin View Transitions entre documentos (esos ya animan solos vía CSS).
function setupPageLeave() {
    const hasCrossDocTransitions = 'onpagereveal' in window;
    if (prefersReducedMotion || hasCrossDocTransitions) return;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (link.target === '_blank' || link.origin !== location.origin) return;
        // Los enlaces a un ancla de la misma página solo hacen scroll.
        if (link.pathname === location.pathname && link.search === location.search && link.hash) return;

        e.preventDefault();
        document.body.classList.add('is-leaving');
        setTimeout(() => { location.href = link.href; }, 250);
    });

    // Al volver con el botón "atrás" la página puede venir de caché: se restaura.
    window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
}

document.addEventListener('DOMContentLoaded', () => {
    setupReveal();
    setupImageFade();
    setupPageLeave();
});
