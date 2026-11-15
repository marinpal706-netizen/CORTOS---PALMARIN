// Favoritos de cada usuario (tabla film_favorites de Supabase, ver supabase/schema.sql).
// Hace falta iniciar sesión. Son privados: cada usuario solo ve los suyos.

const FAVORITES_ENABLED = SUPABASE_ENABLED;
const LOGIN_TO_FAVORITE = 'Inicia sesión para guardar tus cortos favoritos.';

const FAVORITE_ICON = '<svg class="heart-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.1 4c2 0 3.4 1.1 4.9 2.9C13.5 5.1 14.9 4 16.9 4c3.5 0 5.7 3.6 4.4 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>';

let favoritesCache = { userId: null, promise: null };

// Devuelve un Set con los slugs favoritos del usuario conectado (vacío si no hay sesión).
function loadMyFavorites() {
    const user = getCurrentUser();
    if (!FAVORITES_ENABLED || !user) return Promise.resolve(new Set());
    if (favoritesCache.userId !== user.id || !favoritesCache.promise) {
        favoritesCache = {
            userId: user.id,
            promise: sb.from('film_favorites').select('film_slug').eq('user_id', user.id)
                .then(({ data, error }) => {
                    if (error) throw error;
                    return new Set(data.map(row => row.film_slug));
                })
                .catch(error => {
                    favoritesCache.promise = null;
                    throw error;
                })
        };
    }
    return favoritesCache.promise;
}

async function setFavorite(slug, on) {
    const user = getCurrentUser();
    const { error } = on
        ? await sb.from('film_favorites').insert({ film_slug: slug })
        : await sb.from('film_favorites').delete().eq('user_id', user.id).eq('film_slug', slug);
    if (error && error.code !== '23505') throw error; // 23505: ya estaba en favoritos
    const favorites = await loadMyFavorites().catch(() => null);
    if (favorites) on ? favorites.add(slug) : favorites.delete(slug);
}

// ---------- Botón de la ficha ----------

function renderFavoriteButton(short) {
    if (!FAVORITES_ENABLED) return '';
    return `
        <button type="button" class="btn btn--ghost fav-button" data-favorite="${escapeHTML(short.slug)}" aria-pressed="false">
            ${FAVORITE_ICON}<span class="fav-button__label">Añadir a favoritos</span>
        </button>`;
}

function mountFavoriteButton(root) {
    const button = root.querySelector('[data-favorite]');
    if (!button) return;
    const slug = button.dataset.favorite;
    const label = button.querySelector('.fav-button__label');
    let pending = false;   // pulsó antes de iniciar sesión
    let busy = false;

    function paint(on) {
        button.setAttribute('aria-pressed', String(on));
        button.classList.toggle('is-active', on);
        label.textContent = on ? 'En tus favoritos' : 'Añadir a favoritos';
    }

    async function toggle(on) {
        busy = true;
        paint(on);
        if (on) {
            button.classList.remove('is-popping');
            void button.offsetWidth;
            button.classList.add('is-popping');
        }
        try {
            await setFavorite(slug, on);
            showToast(on ? 'Añadido a tus favoritos.' : 'Quitado de tus favoritos.', on ? 'success' : 'info');
        } catch (error) {
            console.warn('[PLMRN] Error al guardar el favorito:', error);
            paint(!on);
            showToast('No se ha podido guardar. Inténtalo de nuevo.', 'error');
        } finally {
            busy = false;
        }
    }

    button.addEventListener('click', () => {
        if (busy) return;
        if (!getCurrentUser()) {
            pending = true;
            openAuthDialog('login', LOGIN_TO_FAVORITE);
            return;
        }
        toggle(button.getAttribute('aria-pressed') !== 'true');
    });

    onAuthChange(async (user) => {
        if (!user) {
            paint(false);
            return;
        }
        try {
            const favorites = await loadMyFavorites();
            if (getCurrentUser()?.id !== user.id) return;
            paint(favorites.has(slug));
            if (pending && !favorites.has(slug)) toggle(true);
        } catch (error) {
            console.warn('[PLMRN] No se pudieron cargar los favoritos:', error);
        } finally {
            pending = false;
        }
    });
}
