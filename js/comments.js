// Comentarios de cada corto guardados en Supabase (tabla film_comments).
// Leer es público; para comentar hay que iniciar sesión. Cada usuario puede borrar los suyos.

const COMMENTS_PAGE_SIZE = 20;
const COMMENT_MAX_LENGTH = 1000;
const LOGIN_TO_COMMENT = 'Inicia sesión para comentar.';

const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const fullDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' });

function formatRelative(date) {
    const seconds = Math.round((date - Date.now()) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
    }
    return 'ahora mismo';
}

// ---------- API ----------

async function fetchComments(slug, offset) {
    const { data, error, count } = await sb
        .from('film_comments')
        .select('id, body, score, created_at, user_id, profiles(username)', { count: 'exact' })
        .eq('film_slug', slug)
        .order('created_at', { ascending: false })
        .range(offset, offset + COMMENTS_PAGE_SIZE - 1);
    if (error) throw error;
    return { comments: data, total: count ?? data.length };
}

async function postComment(slug, body) {
    const { data, error } = await sb
        .from('film_comments')
        .insert({ film_slug: slug, body })
        .select('id, body, score, created_at, user_id, profiles(username)')
        .single();
    if (error) throw error;
    return data;
}

async function deleteComment(id) {
    const { error } = await sb.from('film_comments').delete().eq('id', id);
    if (error) throw error;
}

// ---------- Presentación ----------

function renderComment(comment) {
    const name = comment.profiles?.username || 'Usuario';
    const date = new Date(comment.created_at);
    const isMine = getCurrentUser()?.id === comment.user_id;

    return `<li class="comment" data-comment-id="${comment.id}">
        <span class="comment__avatar" aria-hidden="true">${escapeHTML(name.charAt(0).toUpperCase())}</span>
        <div class="comment__main">
            <div class="comment__head">
                <strong class="comment__author">${escapeHTML(name)}</strong>
                ${comment.score ? `<span class="comment__score" title="Valoración de ${escapeHTML(name)}">${renderStarMeter(comment.score, 'star-meter--sm')}</span>` : ''}
                <time class="comment__date" datetime="${date.toISOString()}" title="${fullDate.format(date)}">${formatRelative(date)}</time>
                ${isMine ? `<button type="button" class="comment__delete link-button" data-comment-delete="${comment.id}">Eliminar</button>` : ''}
            </div>
            <p class="comment__body">${escapeHTML(comment.body)}</p>
        </div>
    </li>`;
}

function renderCommentsSection() {
    if (!SUPABASE_ENABLED) return '';

    return `<section class="panel comments" id="comentarios" aria-labelledby="comments-title">
        <div class="panel__head">
            <h2 class="panel__title" id="comments-title">Comentarios</h2>
            <span class="pill" data-comments-count>…</span>
        </div>

        <form class="comment-form" novalidate hidden>
            <label class="sr-only" for="comment-body">Escribe tu comentario</label>
            <textarea id="comment-body" name="body" rows="3" maxlength="${COMMENT_MAX_LENGTH}"
                placeholder="¿Qué te ha parecido el corto?" required></textarea>
            <div class="comment-form__foot">
                <span class="comment-form__counter" aria-live="polite"><span data-comment-length>0</span>/${COMMENT_MAX_LENGTH}</span>
                <button type="submit" class="btn btn--sm" disabled>Publicar</button>
            </div>
            <p class="comment-form__msg" role="status" aria-live="polite"></p>
        </form>

        <p class="comments__login" hidden>
            <button type="button" class="link-button" data-auth-open="login" data-auth-reason="${LOGIN_TO_COMMENT}">Inicia sesión</button>
            o <button type="button" class="link-button" data-auth-open="signup" data-auth-reason="${LOGIN_TO_COMMENT}">crea una cuenta</button>
            para dejar un comentario.
        </p>

        <ul class="comments__list" aria-live="polite"></ul>
        <p class="comments__empty muted" hidden>Todavía no hay comentarios. ¡Escribe el primero!</p>
        <button type="button" class="btn btn--ghost btn--sm comments__more" hidden>Ver más comentarios</button>
    </section>`;
}

function mountComments(root, slug) {
    const section = root.querySelector('.comments');
    if (!section) return;

    const form = section.querySelector('.comment-form');
    const textarea = form.querySelector('textarea');
    const lengthLabel = form.querySelector('[data-comment-length]');
    const submit = form.querySelector('button[type="submit"]');
    const formMessage = form.querySelector('.comment-form__msg');
    const loginPrompt = section.querySelector('.comments__login');
    const list = section.querySelector('.comments__list');
    const empty = section.querySelector('.comments__empty');
    const more = section.querySelector('.comments__more');
    const countLabel = section.querySelector('[data-comments-count]');

    let loaded = [];
    let total = 0;
    let busy = false;
    let ready = false;  // ya se ha cargado la primera página

    function showFormMessage(text, type = 'info') {
        formMessage.textContent = text;
        formMessage.className = `comment-form__msg comment-form__msg--${type}`;
    }

    function updateCount() {
        countLabel.textContent = `${total.toLocaleString('es-ES')} ${total === 1 ? 'comentario' : 'comentarios'}`;
        empty.hidden = total > 0;
        more.hidden = loaded.length >= total;
    }

    function renderList() {
        if (!ready) return;
        list.innerHTML = loaded.map(renderComment).join('');
        updateCount();
    }

    function updateForm() {
        const length = textarea.value.length;
        lengthLabel.textContent = length;
        submit.disabled = busy || textarea.value.trim().length === 0;
    }

    async function loadPage() {
        more.disabled = true;
        try {
            const page = await fetchComments(slug, loaded.length);
            const known = new Set(loaded.map(c => c.id));
            loaded = loaded.concat(page.comments.filter(c => !known.has(c.id)));
            total = page.total;
            ready = true;
            renderList();
        } catch (error) {
            console.warn('[PLMRN] No se pudieron cargar los comentarios:', error);
            countLabel.textContent = '—';
            empty.hidden = false;
            empty.textContent = 'No se han podido cargar los comentarios.';
        } finally {
            more.disabled = false;
        }
    }

    textarea.addEventListener('input', () => {
        updateForm();
        showFormMessage('');
    });

    // Ctrl/Cmd + Enter publica.
    textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.requestSubmit();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const body = textarea.value.trim();
        if (!body || busy) return;

        if (!getCurrentUser()) {
            openAuthDialog('login', LOGIN_TO_COMMENT);
            return;
        }

        busy = true;
        submit.textContent = 'Publicando…';
        updateForm();

        try {
            const comment = await postComment(slug, body);
            loaded.unshift(comment);
            total += 1;
            ready = true;
            renderList();
            textarea.value = '';
            showFormMessage('¡Comentario publicado!', 'success');
        } catch (error) {
            console.warn('[PLMRN] Error al publicar el comentario:', error);
            if ((error?.message || '').includes('comment_rate_limit')) {
                showFormMessage('Espera unos segundos antes de volver a comentar.', 'error');
            } else if (['42501', 'PGRST301', 'PGRST303'].includes(error?.code) || error?.status === 401) {
                showFormMessage('Tu sesión ha caducado. Vuelve a iniciar sesión para comentar.', 'error');
                openAuthDialog('login', LOGIN_TO_COMMENT);
            } else {
                showFormMessage('No se ha podido publicar el comentario. Inténtalo de nuevo.', 'error');
            }
        } finally {
            busy = false;
            submit.textContent = 'Publicar';
            updateForm();
        }
    });

    list.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-comment-delete]');
        if (!button) return;
        if (!confirm('¿Seguro que quieres eliminar tu comentario?')) return;

        const id = Number(button.dataset.commentDelete);
        button.disabled = true;
        try {
            await deleteComment(id);
            loaded = loaded.filter(c => c.id !== id);
            total = Math.max(0, total - 1);
            renderList();
            showToast('Comentario eliminado.', 'info');
        } catch (error) {
            console.warn('[PLMRN] Error al eliminar el comentario:', error);
            button.disabled = false;
            showToast('No se ha podido eliminar el comentario.', 'error');
        }
    });

    more.addEventListener('click', loadPage);

    // Con sesión se muestra el formulario; sin sesión, la invitación a entrar.
    // Se vuelve a pintar la lista para mostrar u ocultar los botones "Eliminar".
    onAuthChange((user) => {
        form.hidden = !user;
        loginPrompt.hidden = Boolean(user);
        showFormMessage('');
        renderList();
    });

    updateForm();
    loadPage();
}
