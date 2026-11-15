// Comentarios de cada corto guardados en Supabase (tabla film_comments).
// Leer es público; para comentar, responder o dar "me gusta" hay que iniciar sesión.
// Las respuestas tienen un solo nivel: cuelgan siempre del comentario principal.

const COMMENTS_PAGE_SIZE = 20;
const COMMENT_MAX_LENGTH = 1000;
const LOGIN_TO_COMMENT = 'Inicia sesión para comentar.';
const LOGIN_TO_LIKE = 'Inicia sesión para dar me gusta.';
const COMMENT_FIELDS = 'id, body, score, created_at, user_id, parent_id, like_count, profiles(username)';

const relativeTime = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const fullDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' });

const HEART_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';

function formatRelative(date) {
    const seconds = Math.round((date - Date.now()) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
    }
    return 'ahora mismo';
}

// ---------- API ----------

// Página de comentarios principales (sin las respuestas).
async function fetchComments(slug, offset) {
    const { data, error, count } = await sb
        .from('film_comments')
        .select(COMMENT_FIELDS, { count: 'exact' })
        .eq('film_slug', slug)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + COMMENTS_PAGE_SIZE - 1);
    if (error) throw error;
    return { comments: data, total: count ?? data.length };
}

// Respuestas de varios comentarios, de la más antigua a la más nueva.
async function fetchReplies(parentIds) {
    if (!parentIds.length) return [];
    const { data, error } = await sb
        .from('film_comments')
        .select(COMMENT_FIELDS)
        .in('parent_id', parentIds)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

// Número total de comentarios del corto (principales + respuestas).
async function countComments(slug) {
    const { count, error } = await sb
        .from('film_comments')
        .select('id', { count: 'exact', head: true })
        .eq('film_slug', slug);
    if (error) throw error;
    return count ?? 0;
}

// De estos comentarios, ¿a cuáles ha dado "me gusta" el usuario conectado?
async function fetchMyLikes(commentIds) {
    if (!commentIds.length) return [];
    const { data, error } = await sb
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);
    if (error) throw error;
    return data.map(row => row.comment_id);
}

async function postComment(slug, body, parentId = null) {
    const row = { film_slug: slug, body };
    if (parentId) row.parent_id = parentId;
    const { data, error } = await sb
        .from('film_comments')
        .insert(row)
        .select(COMMENT_FIELDS)
        .single();
    if (error) throw error;
    return data;
}

async function deleteComment(id) {
    const { error } = await sb.from('film_comments').delete().eq('id', id);
    if (error) throw error;
}

async function likeComment(id) {
    const { error } = await sb.from('comment_likes').insert({ comment_id: id });
    if (error && error.code !== '23505') throw error; // 23505: ya tenía el "me gusta"
}

async function unlikeComment(id, user) {
    const { error } = await sb.from('comment_likes').delete().eq('comment_id', id).eq('user_id', user.id);
    if (error) throw error;
}

// ---------- Presentación ----------

function renderLikeButton(comment, liked) {
    const count = comment.like_count || 0;
    return `<button type="button" class="comment__action comment__like${liked ? ' is-liked' : ''}"
            data-comment-like="${comment.id}" aria-pressed="${liked}"
            aria-label="${liked ? 'Quitar me gusta' : 'Me gusta'}${count ? ` (${count})` : ''}">
            ${HEART_ICON}<span class="comment__like-count">${count || ''}</span>
        </button>`;
}

function renderComment(comment, state) {
    const name = comment.profiles?.username || 'Usuario';
    const date = new Date(comment.created_at);
    const isMine = getCurrentUser()?.id === comment.user_id;
    const isReply = Boolean(comment.parent_id);
    const threadId = comment.parent_id || comment.id;
    const replies = isReply ? [] : (state.replies.get(comment.id) || []);
    const isNew = !state.rendered.has(comment.id);
    state.rendered.add(comment.id);

    return `<li class="comment${isReply ? ' comment--reply' : ''}${isNew ? ' is-new' : ''}" data-comment-id="${comment.id}">
        <span class="comment__avatar" aria-hidden="true">${escapeHTML(name.charAt(0).toUpperCase())}</span>
        <div class="comment__main">
            <div class="comment__head">
                <strong class="comment__author">${escapeHTML(name)}</strong>
                ${comment.score ? `<span class="comment__score" title="Valoración de ${escapeHTML(name)}">${renderStarMeter(comment.score, 'star-meter--sm')}</span>` : ''}
                <time class="comment__date" datetime="${date.toISOString()}" title="${fullDate.format(date)}">${formatRelative(date)}</time>
            </div>
            <p class="comment__body">${escapeHTML(comment.body)}</p>
            <div class="comment__actions">
                ${renderLikeButton(comment, state.liked.has(comment.id))}
                <button type="button" class="comment__action" data-comment-reply="${threadId}" data-reply-to="${escapeHTML(name)}">Responder</button>
                ${isMine ? `<button type="button" class="comment__action comment__delete" data-comment-delete="${comment.id}">Eliminar</button>` : ''}
            </div>
            ${replies.length ? `<ul class="comment__replies">${replies.map(reply => renderComment(reply, state)).join('')}</ul>` : ''}
            ${!isReply && state.replyingTo === comment.id ? renderReplyForm(comment.id, state.replyDraft) : ''}
        </div>
    </li>`;
}

function renderReplyForm(parentId, draft) {
    return `<form class="comment-form comment-form--reply" data-reply-form="${parentId}" novalidate>
        <label class="sr-only" for="reply-${parentId}">Escribe tu respuesta</label>
        <textarea id="reply-${parentId}" name="body" rows="2" maxlength="${COMMENT_MAX_LENGTH}"
            placeholder="Escribe tu respuesta…" required>${escapeHTML(draft)}</textarea>
        <div class="comment-form__foot">
            <button type="button" class="link-button" data-reply-cancel>Cancelar</button>
            <button type="submit" class="btn btn--sm"${draft.trim() ? '' : ' disabled'}>Responder</button>
        </div>
        <p class="comment-form__msg" role="status" aria-live="polite"></p>
    </form>`;
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

// Mensaje de error común al publicar un comentario o una respuesta.
function commentErrorMessage(error) {
    const message = error?.message || '';
    if (message.includes('comment_rate_limit')) return 'Espera unos segundos antes de volver a comentar.';
    if (message.includes('invalid_parent')) return 'Ese comentario ya no existe.';
    if (['42501', 'PGRST301', 'PGRST303'].includes(error?.code) || error?.status === 401) {
        return 'Tu sesión ha caducado. Vuelve a iniciar sesión para comentar.';
    }
    return 'No se ha podido publicar. Inténtalo de nuevo.';
}

function isSessionError(error) {
    return ['42501', 'PGRST301', 'PGRST303'].includes(error?.code) || error?.status === 401;
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

    // Estado compartido con renderComment().
    const state = {
        replies: new Map(),   // id del comentario principal → respuestas
        liked: new Set(),     // ids a los que el usuario ha dado "me gusta"
        rendered: new Set(),  // ids ya pintados (solo se animan los nuevos)
        replyingTo: null,     // comentario principal con el formulario de respuesta abierto
        replyDraft: ''
    };
    let loaded = [];       // comentarios principales cargados
    let topTotal = 0;      // total de comentarios principales (para "Ver más")
    let total = 0;         // total de comentarios + respuestas
    let busy = false;
    let ready = false;     // ya se ha cargado la primera página
    const pendingLikes = new Set();  // "me gusta" que se están guardando

    function showFormMessage(text, type = 'info') {
        formMessage.textContent = text;
        formMessage.className = `comment-form__msg comment-form__msg--${type}`;
    }

    function updateCount() {
        countLabel.textContent = `${total.toLocaleString('es-ES')} ${total === 1 ? 'comentario' : 'comentarios'}`;
        empty.hidden = loaded.length > 0;
        more.hidden = loaded.length >= topTotal;
    }

    function renderList() {
        if (!ready) return;
        list.innerHTML = loaded.map(comment => renderComment(comment, state)).join('');
        updateCount();
    }

    function updateForm() {
        lengthLabel.textContent = textarea.value.length;
        submit.disabled = busy || textarea.value.trim().length === 0;
    }

    function allComments() {
        return loaded.concat(...state.replies.values());
    }

    function findComment(id) {
        return allComments().find(c => c.id === id);
    }

    // Carga los "me gusta" del usuario para los comentarios indicados.
    async function loadMyLikes(ids) {
        const user = getCurrentUser();
        if (!user || !ids.length) return;
        try {
            const likedIds = await fetchMyLikes(ids);
            if (getCurrentUser()?.id !== user.id) return;
            likedIds.forEach(id => state.liked.add(id));
        } catch (error) {
            console.warn('[PLMRN] No se pudieron cargar tus me gusta:', error);
        }
    }

    async function loadPage() {
        more.disabled = true;
        try {
            const page = await fetchComments(slug, loaded.length);
            const known = new Set(loaded.map(c => c.id));
            const fresh = page.comments.filter(c => !known.has(c.id));
            const replies = await fetchReplies(fresh.map(c => c.id));
            replies.forEach(reply => {
                if (!state.replies.has(reply.parent_id)) state.replies.set(reply.parent_id, []);
                state.replies.get(reply.parent_id).push(reply);
            });
            loaded = loaded.concat(fresh);
            topTotal = page.total;
            total = await countComments(slug).catch(() => topTotal);
            await loadMyLikes(fresh.map(c => c.id).concat(replies.map(r => r.id)));
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

    function openReplyForm(parentId, replyTo) {
        if (!getCurrentUser()) {
            openAuthDialog('login', LOGIN_TO_COMMENT);
            return;
        }
        const parent = findComment(parentId);
        const parentName = parent?.profiles?.username;
        // Al responder a una respuesta se menciona a su autor.
        state.replyDraft = replyTo && replyTo !== parentName && replyTo !== getCurrentUsername() ? `@${replyTo} ` : '';
        state.replyingTo = parentId;
        renderList();
        const field = list.querySelector(`[data-reply-form="${parentId}"] textarea`);
        if (field) {
            field.focus();
            field.setSelectionRange(field.value.length, field.value.length);
        }
    }

    function closeReplyForm() {
        state.replyingTo = null;
        state.replyDraft = '';
        renderList();
    }

    async function toggleLike(button) {
        const user = getCurrentUser();
        if (!user) {
            openAuthDialog('login', LOGIN_TO_LIKE);
            return;
        }
        const id = Number(button.dataset.commentLike);
        const comment = findComment(id);
        if (!comment || pendingLikes.has(id)) return;

        // Cambia el corazón y el contador en el sitio, sin repintar la lista.
        function setLiked(liked) {
            if (state.liked.has(id) === liked) return;
            if (liked) state.liked.add(id); else state.liked.delete(id);
            comment.like_count = Math.max(0, (comment.like_count || 0) + (liked ? 1 : -1));
            const live = list.querySelector(`[data-comment-like="${id}"]`);
            if (!live) return;
            live.outerHTML = renderLikeButton(comment, liked);
            if (liked) list.querySelector(`[data-comment-like="${id}"]`)?.classList.add('is-pop');
        }

        // Se actualiza al momento y se deshace si falla.
        const wasLiked = state.liked.has(id);
        pendingLikes.add(id);
        setLiked(!wasLiked);
        try {
            if (wasLiked) await unlikeComment(id, user);
            else await likeComment(id);
        } catch (error) {
            console.warn('[PLMRN] Error con el me gusta:', error);
            setLiked(wasLiked);
            if (isSessionError(error)) openAuthDialog('login', LOGIN_TO_LIKE);
            else showToast('No se ha podido guardar tu me gusta.', 'error');
        } finally {
            pendingLikes.delete(id);
        }
    }

    textarea.addEventListener('input', () => {
        updateForm();
        showFormMessage('');
    });

    // Ctrl/Cmd + Enter publica (también en las respuestas).
    section.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && event.target.matches('textarea')) {
            event.target.form?.requestSubmit();
        }
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
            topTotal += 1;
            total += 1;
            ready = true;
            renderList();
            textarea.value = '';
            showFormMessage('¡Comentario publicado!', 'success');
        } catch (error) {
            console.warn('[PLMRN] Error al publicar el comentario:', error);
            showFormMessage(commentErrorMessage(error), 'error');
            if (isSessionError(error)) openAuthDialog('login', LOGIN_TO_COMMENT);
        } finally {
            busy = false;
            submit.textContent = 'Publicar';
            updateForm();
        }
    });

    // Formulario de respuesta (se crea dentro de la lista).
    list.addEventListener('input', (event) => {
        const replyForm = event.target.closest('[data-reply-form]');
        if (!replyForm) return;
        state.replyDraft = event.target.value;
        replyForm.querySelector('button[type="submit"]').disabled = !state.replyDraft.trim();
        replyForm.querySelector('.comment-form__msg').textContent = '';
    });

    list.addEventListener('submit', async (event) => {
        const replyForm = event.target.closest('[data-reply-form]');
        if (!replyForm) return;
        event.preventDefault();

        const parentId = Number(replyForm.dataset.replyForm);
        const body = state.replyDraft.trim();
        const button = replyForm.querySelector('button[type="submit"]');
        const message = replyForm.querySelector('.comment-form__msg');
        if (!body || button.disabled) return;

        button.disabled = true;
        button.textContent = 'Publicando…';
        try {
            const reply = await postComment(slug, body, parentId);
            const threadId = reply.parent_id || parentId;
            if (!state.replies.has(threadId)) state.replies.set(threadId, []);
            state.replies.get(threadId).push(reply);
            total += 1;
            state.replyingTo = null;
            state.replyDraft = '';
            renderList();
            showToast('Respuesta publicada.', 'success');
        } catch (error) {
            console.warn('[PLMRN] Error al publicar la respuesta:', error);
            button.disabled = false;
            button.textContent = 'Responder';
            message.textContent = commentErrorMessage(error);
            message.className = 'comment-form__msg comment-form__msg--error';
            if (isSessionError(error)) openAuthDialog('login', LOGIN_TO_COMMENT);
        }
    });

    list.addEventListener('click', async (event) => {
        const likeButton = event.target.closest('[data-comment-like]');
        if (likeButton) {
            toggleLike(likeButton);
            return;
        }

        const replyButton = event.target.closest('[data-comment-reply]');
        if (replyButton) {
            openReplyForm(Number(replyButton.dataset.commentReply), replyButton.dataset.replyTo);
            return;
        }

        if (event.target.closest('[data-reply-cancel]')) {
            closeReplyForm();
            return;
        }

        const deleteButton = event.target.closest('[data-comment-delete]');
        if (!deleteButton) return;

        const id = Number(deleteButton.dataset.commentDelete);
        const comment = findComment(id);
        const replyCount = comment && !comment.parent_id ? (state.replies.get(id) || []).length : 0;
        const question = replyCount
            ? `¿Seguro que quieres eliminar tu comentario? También se borrarán sus ${replyCount} ${replyCount === 1 ? 'respuesta' : 'respuestas'}.`
            : '¿Seguro que quieres eliminar tu comentario?';
        if (!confirm(question)) return;

        deleteButton.disabled = true;
        try {
            await deleteComment(id);
            if (comment?.parent_id) {
                const siblings = state.replies.get(comment.parent_id) || [];
                state.replies.set(comment.parent_id, siblings.filter(r => r.id !== id));
                total = Math.max(0, total - 1);
            } else {
                loaded = loaded.filter(c => c.id !== id);
                state.replies.delete(id);
                if (state.replyingTo === id) state.replyingTo = null;
                topTotal = Math.max(0, topTotal - 1);
                total = Math.max(0, total - 1 - replyCount);
            }
            renderList();
            showToast('Comentario eliminado.', 'info');
        } catch (error) {
            console.warn('[PLMRN] Error al eliminar el comentario:', error);
            deleteButton.disabled = false;
            showToast('No se ha podido eliminar el comentario.', 'error');
        }
    });

    more.addEventListener('click', loadPage);

    // Con sesión se muestra el formulario; sin sesión, la invitación a entrar.
    // Se vuelven a cargar los "me gusta" y a pintar la lista (botones "Eliminar").
    onAuthChange(async (user) => {
        form.hidden = !user;
        loginPrompt.hidden = Boolean(user);
        showFormMessage('');
        state.liked.clear();
        if (!user) state.replyingTo = null;
        if (user && ready) await loadMyLikes(allComments().map(c => c.id));
        renderList();
    });

    updateForm();
    loadPage();
}
