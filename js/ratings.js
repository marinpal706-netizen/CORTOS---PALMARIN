// Valoraciones con estrellas guardadas en Supabase (ver supabase/schema.sql).
// Hace falta iniciar sesión para votar; cada usuario tiene un voto por corto
// y puede cambiarlo. La media se calcula en el servidor.

const RATINGS_ENABLED = SUPABASE_ENABLED;
const LOGIN_TO_RATE = 'Inicia sesión para valorar este corto.';

const ratingFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------- API ----------

// Devuelve un Map slug → { average, votes }.
async function fetchRatings(slug) {
    let query = sb.from('film_rating_summary').select('film_slug, average, vote_count');
    if (slug) query = query.eq('film_slug', slug);

    const { data, error } = await query;
    if (error) throw error;
    return new Map(data.map(r => [r.film_slug, { average: Number(r.average), votes: r.vote_count }]));
}

// Voto del usuario conectado para un corto (o null si aún no ha votado).
async function fetchMyVote(slug, user) {
    const { data, error } = await sb
        .from('film_user_votes')
        .select('score')
        .eq('film_slug', slug)
        .eq('user_id', user.id)
        .maybeSingle();
    if (error) throw error;
    return data?.score ?? null;
}

async function submitRating(slug, score) {
    const { data, error } = await sb.rpc('submit_rating', { p_film: slug, p_score: score });
    if (error) throw error;
    return data;
}

// ---------- Presentación ----------

function formatAverage(average) {
    return `${ratingFormat.format(average)} de 5 estrellas`;
}

function formatVotes(votes) {
    return `basado en ${votes.toLocaleString('es-ES')} ${votes === 1 ? 'voto' : 'votos'}`;
}

// Cinco estrellas rellenas en proporción a la media (admite medias estrellas).
function renderStarMeter(average, className = '') {
    const percent = Math.max(0, Math.min(100, (average / 5) * 100));
    return `<span class="star-meter ${className}" role="img" aria-label="${formatAverage(average)}">
        <span class="star-meter__fill" style="width:${percent}%"></span>
    </span>`;
}

function renderRatingSummary(rating) {
    if (!rating || !rating.votes) {
        return `${renderStarMeter(0)}<span class="rating__text">Todavía no hay valoraciones. ¡Sé el primero!</span>`;
    }
    return `${renderStarMeter(rating.average)}
        <span class="rating__text"><strong>${formatAverage(rating.average)}</strong> · ${formatVotes(rating.votes)}</span>`;
}

// ---------- Tarjetas del inicio ----------

function renderCardRatingSlot(short) {
    return RATINGS_ENABLED ? `<div class="card__rating" data-rating-for="${escapeHTML(short.slug)}"></div>` : '';
}

async function fillCardRatings() {
    if (!RATINGS_ENABLED) return;
    try {
        const ratings = await fetchRatings();
        document.querySelectorAll('[data-rating-for]').forEach(slot => {
            const rating = ratings.get(slot.dataset.ratingFor);
            slot.innerHTML = rating && rating.votes
                ? `${renderStarMeter(rating.average, 'star-meter--sm')}
                   <span>${ratingFormat.format(rating.average)}</span>
                   <span class="card__votes">(${rating.votes.toLocaleString('es-ES')})</span>`
                : '<span class="card__votes">Sin valoraciones</span>';
            slot.classList.add('is-ready');
        });
    } catch (error) {
        console.warn('[PLMRN] No se pudieron cargar las valoraciones:', error);
        document.querySelectorAll('[data-rating-for]').forEach(slot => slot.remove());
    }
}

// ---------- Componente de valoración de la ficha ----------

function renderRater(short) {
    if (!RATINGS_ENABLED) {
        return `<section class="rating" aria-labelledby="rating-title">
            <h2 class="label" id="rating-title">Valoración</h2>
            <p class="muted">Las valoraciones estarán disponibles muy pronto.</p>
        </section>`;
    }

    const stars = [1, 2, 3, 4, 5].map(n => `
        <input type="radio" class="sr-only" name="score" id="star-${n}" value="${n}">
        <label for="star-${n}" class="rater__star" data-value="${n}" title="${n} ${n === 1 ? 'estrella' : 'estrellas'}">
            <span aria-hidden="true">★</span><span class="sr-only">${n} de 5 estrellas</span>
        </label>`).join('');

    return `<section class="rating" aria-labelledby="rating-title" data-slug="${escapeHTML(short.slug)}">
        <h2 class="label" id="rating-title">Valoración</h2>
        <div class="rating__summary" aria-live="polite">
            <span class="rating__text">Cargando valoraciones…</span>
        </div>
        <form class="rater" novalidate>
            <fieldset>
                <legend class="rater__legend">¿Qué te ha parecido?</legend>
                <div class="rater__stars">${stars}</div>
                <button type="submit" class="btn btn--sm" disabled>Enviar valoración</button>
            </fieldset>
            <p class="rater__login" hidden>
                <button type="button" class="link-button" data-auth-open="login" data-auth-reason="${LOGIN_TO_RATE}">Inicia sesión</button>
                o <button type="button" class="link-button" data-auth-open="signup" data-auth-reason="${LOGIN_TO_RATE}">crea una cuenta</button>
                para valorar.
            </p>
            <p class="rater__msg" role="status" aria-live="polite"></p>
        </form>
    </section>`;
}

function mountRater(root) {
    const section = root.querySelector('.rating[data-slug]');
    if (!section) return;

    const slug = section.dataset.slug;
    const summary = section.querySelector('.rating__summary');
    const form = section.querySelector('.rater');
    const fieldset = form.querySelector('fieldset');
    const legend = form.querySelector('.rater__legend');
    const starsBox = form.querySelector('.rater__stars');
    const labels = [...form.querySelectorAll('.rater__star')];
    const button = form.querySelector('button[type="submit"]');
    const loginPrompt = form.querySelector('.rater__login');
    const message = form.querySelector('.rater__msg');

    let myVote = null;   // voto guardado del usuario conectado
    let busy = false;

    const selected = () => Number(form.querySelector('input:checked')?.value || 0);

    function paint(value, preview = false) {
        labels.forEach(label => {
            const lit = Number(label.dataset.value) <= value;
            label.classList.toggle('is-lit', lit && !preview);
            label.classList.toggle('is-preview', lit && preview);
        });
    }

    function select(value) {
        form.querySelectorAll('input').forEach(input => { input.checked = Number(input.value) === value; });
        paint(value);
    }

    function showMessage(text, type = 'info') {
        message.textContent = text;
        message.className = `rater__msg rater__msg--${type}`;
    }

    // Ajusta textos y botón según haya sesión, voto previo y selección actual.
    function refresh() {
        const user = getCurrentUser();
        loginPrompt.hidden = Boolean(user);
        legend.textContent = myVote
            ? `Tu valoración: ${myVote} de 5 · puedes cambiarla cuando quieras`
            : '¿Qué te ha parecido?';
        button.textContent = myVote ? 'Actualizar valoración' : 'Enviar valoración';
        button.disabled = busy || !selected() || (Boolean(user) && selected() === myVote);
    }

    // Vista previa al pasar el ratón y estado seleccionado.
    labels.forEach(label => {
        label.addEventListener('pointerenter', () => !fieldset.disabled && paint(Number(label.dataset.value), true));
    });
    starsBox.addEventListener('pointerleave', () => paint(selected()));

    form.addEventListener('change', () => {
        const value = selected();
        paint(value);
        const label = labels[value - 1];
        label.classList.remove('is-pop');
        void label.offsetWidth; // reinicia la animación
        label.classList.add('is-pop');
        showMessage('');
        refresh();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const score = selected();
        if (!score || busy) return;

        // Sin sesión: se pide iniciar sesión y se conserva la selección.
        if (!getCurrentUser()) {
            showMessage(LOGIN_TO_RATE, 'info');
            openAuthDialog('login', LOGIN_TO_RATE);
            return;
        }

        busy = true;
        fieldset.disabled = true;
        button.textContent = 'Enviando…';

        try {
            const result = await submitRating(slug, score);
            myVote = result.your_score;
            summary.innerHTML = renderRatingSummary({ average: Number(result.average), votes: result.votes });

            if (result.status === 'updated') showMessage('Tu valoración se ha actualizado.', 'success');
            else if (result.status === 'unchanged') showMessage('Tu valoración no ha cambiado.', 'info');
            else showMessage('¡Gracias por tu valoración!', 'success');
        } catch (error) {
            console.warn('[PLMRN] Error al enviar la valoración:', error);
            if (error?.code === '28000' || error?.code === 'PGRST301' || error?.status === 401) {
                showMessage('Tu sesión ha caducado. Vuelve a iniciar sesión para valorar.', 'error');
                openAuthDialog('login', LOGIN_TO_RATE);
            } else {
                showMessage('No se ha podido enviar tu valoración. Comprueba tu conexión e inténtalo de nuevo.', 'error');
            }
        } finally {
            busy = false;
            fieldset.disabled = false;
            refresh();
        }
    });

    // Al iniciar o cerrar sesión se carga (o se olvida) el voto del usuario.
    onAuthChange(async (user) => {
        myVote = null;
        showMessage('');
        if (!user) {
            select(0);
            refresh();
            return;
        }

        const pending = selected(); // estrella elegida antes de iniciar sesión
        try {
            myVote = await fetchMyVote(slug, user);
        } catch (error) {
            console.warn('[PLMRN] No se pudo cargar tu valoración:', error);
        }
        if (getCurrentUser()?.id !== user.id) return; // cambió la sesión mientras tanto

        if (pending && pending !== myVote) {
            showMessage('Ya puedes enviar tu valoración.', 'info');
        } else if (myVote) {
            select(myVote);
        }
        refresh();
    });

    refresh();

    fetchRatings(slug)
        .then(ratings => { summary.innerHTML = renderRatingSummary(ratings.get(slug)); })
        .catch(error => {
            console.warn('[PLMRN] No se pudo cargar la valoración:', error);
            summary.innerHTML = '<span class="rating__text muted">No se ha podido cargar la valoración media.</span>';
        });
}
