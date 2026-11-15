// Catálogo de cortos. Se lee de Supabase (tabla "shorts", que se gestiona
// desde admin.html). Si Supabase no responde o no está configurado, se usa
// la copia de seguridad de js/data.js, así que la web nunca se queda vacía.

const SHORT_FIELDS = 'slug,title,year,genre,thumbnail,poster,trailer,movie,synopsis,laurels';
const SHORTS_TIMEOUT_MS = 6000;

let shortsCatalog = null;

// Deja cada corto con la misma forma que los de data.js.
function normalizeShort(row) {
    return {
        slug: row.slug,
        title: row.title || '',
        year: row.year ?? null,
        genre: row.genre || '',
        thumbnail: row.thumbnail || '',
        poster: row.poster || '',
        trailer: row.trailer || '',
        movie: row.movie || '',
        synopsis: row.synopsis || '',
        laurels: Array.isArray(row.laurels) ? row.laurels.filter(l => l && l.name) : []
    };
}

async function fetchPublishedShorts() {
    const url = `${SUPABASE_URL}/rest/v1/shorts?select=${SHORT_FIELDS}&published=eq.true&order=position.asc,created_at.desc`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SHORTS_TIMEOUT_MS);
    try {
        const response = await fetch(url, { headers: { apikey: SUPABASE_KEY }, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error('Respuesta inesperada');
        return rows.map(normalizeShort);
    } finally {
        clearTimeout(timer);
    }
}

// Devuelve siempre la misma promesa: el catálogo se descarga una vez por página.
function loadShorts() {
    if (!shortsCatalog) {
        const backup = typeof SHORTS === 'undefined' ? [] : SHORTS;
        const configured = typeof SUPABASE_URL === 'string' && SUPABASE_URL && SUPABASE_KEY;
        shortsCatalog = configured
            ? fetchPublishedShorts().catch(error => {
                console.warn('[PLMRN] No se ha podido cargar el catálogo de Supabase; se usa la copia de js/data.js.', error);
                return backup;
            })
            : Promise.resolve(backup);
    }
    return shortsCatalog;
}
