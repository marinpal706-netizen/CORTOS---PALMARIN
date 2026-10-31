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
                <li class="laurel"><span class="laurel__star" aria-hidden="true">★</span>
                    <strong>${escapeHTML(l.type)}</strong> ${escapeHTML(l.name)}
                </li>`).join('')}
        </ul>`;
}

// Sustituye una imagen rota por un marcador con el título.
function handleImageError(img) {
    img.onerror = null;
    img.closest('.media')?.classList.add('media--missing');
    img.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
});
