// Página "Sobre nosotros": cifras del estudio y enlaces de contacto.
document.addEventListener('DOMContentLoaded', () => {
    loadShorts().then(shorts => {
        const stats = {
            shorts: shorts.length,
            laurels: [...shorts, ...SCRIPTS].reduce((sum, item) => sum + (item.laurels?.length || 0), 0),
            scripts: SCRIPTS.length
        };
        document.querySelectorAll('[data-stat]').forEach(el => { el.textContent = stats[el.dataset.stat]; });
    });

    // Si hay correo, el botón principal pasa a ser "Escribir un correo".
    if (SITE.email) {
        const button = document.getElementById('contact-button');
        button.href = `mailto:${SITE.email}`;
        button.textContent = 'Escribir un correo';
    }

    const social = [['YouTube', SITE.youtube], ['Instagram', SITE.instagram], ['TikTok', SITE.tiktok], ['X', SITE.x]]
        .filter(([, url]) => url);
    if (social.length) {
        const box = document.getElementById('contact-social');
        box.innerHTML = 'También nos encontrarás en ' + social
            .map(([name, url]) => `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${name}</a>`)
            .join(', ') + '.';
        box.hidden = false;
    }
});
