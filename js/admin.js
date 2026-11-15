// Panel de administración (admin.html): crear, editar, ordenar, ocultar y borrar cortos.
// La seguridad la pone Supabase: solo las cuentas de la tabla "admins" pueden
// escribir (ver supabase/README.md). Esta página es solo el formulario.

const MEDIA_BUCKET = 'shorts-media';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;           // las imágenes más grandes se reducen antes de subirlas
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
// Todas las columnas: incluye "backdrop" cuando ya se ha creado en Supabase.
const ADMIN_FIELDS = '*';
// ¿Existe ya la columna "backdrop"? (se añade al ejecutar supabase/schema.sql)
const hasBackdropColumn = () => admin.shorts.some(s => 'backdrop' in s);
const IMAGE_PATTERN = /^(|img\/[A-Za-z0-9._/-]{1,200}|https:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%-]{1,500})$/;
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

const admin = {
    shorts: [],
    editing: null,   // slug del corto abierto, '' si es uno nuevo, null si no hay ninguno
    dirty: false,
    busy: false,
    userId: null
};

// ---------- Utilidades ----------

function slugify(text) {
    return (text || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/, '');
}

function adminErrorMessage(error) {
    const code = String(error?.code || error?.statusCode || '');
    const text = `${error?.message || ''} ${error?.error || ''}`.toLowerCase();

    if (code === '23505') return 'Ya existe un corto con ese identificador. Escribe otro distinto.';
    if (code === '42501' || code === 'PGRST116' || text.includes('row-level security') || text.includes('unauthorized')) {
        return 'Tu cuenta no tiene permiso para hacer este cambio.';
    }
    if (code === '23514') return 'Algún campo no es válido. Revisa los enlaces (deben empezar por https://) y las rutas de las imágenes.';
    if (text.includes('invalid_laurels')) return 'Revisa los festivales: cada uno necesita un nombre.';
    if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202' || code === '42883') {
        return 'Falta ejecutar el SQL en Supabase (archivo supabase/schema.sql).';
    }
    if (code === '413' || text.includes('exceeded') || text.includes('too large')) return 'La imagen pesa demasiado (máximo 5 MB).';
    if (text.includes('mime') || text.includes('invalid_mime')) return 'Formato no admitido. Usa PNG, JPG, WEBP o AVIF.';
    if (text.includes('bucket not found')) return 'Falta ejecutar el SQL en Supabase (no existe la carpeta de imágenes).';
    if (text.includes('failed to fetch') || text.includes('network')) return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.';
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

function adminRoot() {
    return document.getElementById('admin-root');
}

function renderAdminMessage(title, text, action = '') {
    adminRoot().innerHTML = `
        <div class="admin-state">
            <h2>${title}</h2>
            <p>${text}</p>
            ${action}
        </div>`;
}

// ---------- Datos ----------

async function fetchAllShorts() {
    const { data, error } = await sb
        .from('shorts')
        .select(ADMIN_FIELDS)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Reduce las fotos muy grandes (p. ej. del móvil) para que la web cargue rápido.
async function shrinkImage(file) {
    const resizable = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
    if (!resizable || !window.createImageBitmap) return file;

    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return file;
    }
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SHRINK_ABOVE_BYTES) {
        bitmap.close?.();
        return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const toBlob = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
    let blob = await toBlob('image/webp', 0.86);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.88);
    return blob && blob.size < file.size ? blob : file;
}

async function uploadImage(file, slug, kind) {
    if (!IMAGE_TYPES.includes(file.type)) {
        throw { message: 'invalid_mime' };
    }
    const image = await shrinkImage(file);
    if (image.size > MAX_UPLOAD_BYTES) throw { code: '413', message: 'too large' };

    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' }[image.type];
    const path = `${slug || 'sin-nombre'}/${kind}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, image, {
        contentType: image.type,
        cacheControl: '31536000',
        upsert: false
    });
    if (error) throw error;
    return sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---------- Lista de cortos ----------

function renderShortList() {
    const shorts = admin.shorts;
    return `
        <div class="admin-list__head">
            <h2 class="admin-list__title">Cortos <span class="pill">${shorts.length}</span></h2>
            <button type="button" class="btn btn--sm" data-admin="new">+ Nuevo corto</button>
        </div>
        ${shorts.length ? `
        <ol class="admin-list__items">
            ${shorts.map((short, index) => `
                <li class="admin-item${short.slug === admin.editing ? ' is-active' : ''}${short.published ? '' : ' is-hidden'}">
                    <button type="button" class="admin-item__main" data-admin="edit" data-slug="${escapeHTML(short.slug)}">
                        <span class="admin-item__thumb media media--video" data-title="${escapeHTML(short.title)}">
                            ${short.thumbnail ? `<img src="${escapeHTML(short.thumbnail)}" alt="" loading="lazy" onerror="handleImageError(this)">` : ''}
                        </span>
                        <span class="admin-item__text">
                            <strong>${escapeHTML(short.title)}</strong>
                            <small>${short.published ? 'Publicado' : 'Oculto'}${short.genre ? ` · ${escapeHTML(short.genre)}` : ''}</small>
                        </span>
                    </button>
                    <span class="admin-item__order">
                        <button type="button" class="admin-icon" data-admin="up" data-slug="${escapeHTML(short.slug)}" aria-label="Subir ${escapeHTML(short.title)}" ${index === 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>
                        <button type="button" class="admin-icon" data-admin="down" data-slug="${escapeHTML(short.slug)}" aria-label="Bajar ${escapeHTML(short.title)}" ${index === shorts.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
                    </span>
                </li>`).join('')}
        </ol>` : '<p class="muted">Todavía no hay cortos. Pulsa "Nuevo corto" para añadir el primero.</p>'}
        <p class="field__hint admin-list__hint">El orden de esta lista es el de la web ("Más recientes"). Usa las flechas para moverlos.</p>`;
}

// ---------- Formulario ----------

function renderImageField(name, label, hint, value, variant) {
    return `
        <div class="image-field" data-image-field="${name}">
            <span class="field__label">${label}</span>
            <div class="image-field__preview media ${variant}" data-title="Sin imagen">
                ${value ? `<img src="${escapeHTML(value)}" alt="" onerror="handleImageError(this)">` : ''}
            </div>
            <div class="image-field__actions">
                <label class="btn btn--sm btn--ghost image-field__upload">
                    Subir imagen
                    <input type="file" accept="${IMAGE_TYPES.join(',')}" data-upload="${name}" hidden>
                </label>
                <button type="button" class="btn btn--sm btn--ghost" data-admin="clear-image" data-name="${name}" ${value ? '' : 'hidden'}>Quitar</button>
            </div>
            <label class="field">
                <span class="sr-only">${label}: ruta o enlace</span>
                <input type="text" name="${name}" value="${escapeHTML(value)}" placeholder="img/archivo.png o https://…" spellcheck="false" autocomplete="off">
            </label>
            <span class="field__hint">${hint}</span>
        </div>`;
}

function renderLaurelRow(laurel = {}) {
    return `
        <div class="laurel-row">
            <label class="field">
                <span class="sr-only">Tipo de reconocimiento</span>
                <input type="text" name="laurel-type" value="${escapeHTML(laurel.type || '')}" placeholder="Seleccionado, Finalista, Ganador…" maxlength="60" list="laurel-types">
            </label>
            <label class="field">
                <span class="sr-only">Nombre del festival</span>
                <input type="text" name="laurel-name" value="${escapeHTML(laurel.name || '')}" placeholder="Nombre del festival" maxlength="120">
            </label>
            <button type="button" class="admin-icon" data-admin="remove-laurel" aria-label="Quitar este festival"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>`;
}

function renderEditor() {
    if (admin.editing === null) {
        return `
            <div class="admin-empty">
                <p>Elige un corto de la lista para editarlo o crea uno nuevo.</p>
                <button type="button" class="btn" data-admin="new">+ Nuevo corto</button>
            </div>`;
    }

    const isNew = admin.editing === '';
    const short = isNew
        ? { slug: '', title: '', year: new Date().getFullYear(), genre: '', thumbnail: '', poster: '', backdrop: '', trailer: '', movie: '', synopsis: '', laurels: [], published: true }
        : admin.shorts.find(s => s.slug === admin.editing);

    return `
        <form class="admin-form" novalidate>
            <div class="admin-form__head">
                <h2 class="admin-form__title">${isNew ? 'Nuevo corto' : `Editar «${escapeHTML(short.title)}»`}</h2>
                ${!isNew && short.published ? `<a class="btn btn--sm btn--ghost" href="${shortUrl(short)}" target="_blank" rel="noopener">Ver en la web ↗</a>` : ''}
            </div>

            <label class="field">
                <span class="field__label">Título *</span>
                <input type="text" name="title" value="${escapeHTML(short.title)}" maxlength="120" required>
            </label>

            <label class="field">
                <span class="field__label">Identificador en la dirección</span>
                <input type="text" name="slug" value="${escapeHTML(short.slug)}" maxlength="80" spellcheck="false" autocomplete="off" ${isNew ? '' : 'readonly'}>
                <span class="field__hint">${isNew
                    ? 'Se rellena solo con el título. Solo minúsculas, números y guiones. No se puede cambiar después: las valoraciones y comentarios van unidos a él.'
                    : `La ficha está en <code>corto.html?id=${escapeHTML(short.slug)}</code>. No se puede cambiar porque las valoraciones y comentarios van unidos a él.`}</span>
            </label>

            <div class="admin-form__row">
                <label class="field">
                    <span class="field__label">Año</span>
                    <input type="number" name="year" value="${short.year ?? ''}" min="1900" max="2100" step="1" inputmode="numeric">
                </label>
                <label class="field">
                    <span class="field__label">Género</span>
                    <input type="text" name="genre" value="${escapeHTML(short.genre)}" maxlength="120" placeholder="Terror / Suspense">
                    <span class="field__hint">Separa varios géneros con "/". Salen como filtros en el inicio.</span>
                </label>
            </div>

            <label class="field">
                <span class="field__label">Sinopsis</span>
                <textarea name="synopsis" rows="5" maxlength="2000">${escapeHTML(short.synopsis)}</textarea>
                <span class="field__hint"><span data-counter>${short.synopsis.length}</span>/2000</span>
            </label>

            <div class="admin-form__row">
                <label class="field">
                    <span class="field__label">Corto completo (YouTube)</span>
                    <input type="url" name="movie" value="${escapeHTML(short.movie)}" placeholder="https://youtu.be/…" spellcheck="false">
                </label>
                <label class="field">
                    <span class="field__label">Tráiler (YouTube)</span>
                    <input type="url" name="trailer" value="${escapeHTML(short.trailer)}" placeholder="https://youtu.be/…" spellcheck="false">
                </label>
            </div>

            <div class="admin-form__images">
                ${renderImageField('thumbnail', 'Miniatura horizontal', 'Sale en las tarjetas del inicio y en "Más cortometrajes". Mejor 16:9.', short.thumbnail, 'media--video')}
                ${renderImageField('poster', 'Póster vertical', 'Sale en la ficha del corto. Si no hay, se usa la miniatura.', short.poster, 'media--poster')}
                ${hasBackdropColumn() ? renderImageField('backdrop', 'Fotograma de fondo (opcional)', 'Un fotograma horizontal limpio, sin título ni créditos. Se usa de fondo en la portada y en la ficha. Si no hay, se usa la miniatura.', short.backdrop || '', 'media--video') : ''}
            </div>

            <fieldset class="admin-form__laurels">
                <legend class="field__label">Festivales y premios</legend>
                <div data-laurels>${(short.laurels || []).map(renderLaurelRow).join('')}</div>
                <button type="button" class="btn btn--sm btn--ghost" data-admin="add-laurel">+ Añadir festival</button>
                <datalist id="laurel-types">
                    <option value="Seleccionado"><option value="Finalista"><option value="Ganador"><option value="Mención especial">
                </datalist>
            </fieldset>

            <label class="admin-check">
                <input type="checkbox" name="published" ${short.published ? 'checked' : ''}>
                <span>Publicado <small>(si lo desmarcas, el corto desaparece de la web pero no se borra)</small></span>
            </label>

            <div class="admin-form__foot">
                <button type="submit" class="btn">${isNew ? 'Crear corto' : 'Guardar cambios'}</button>
                <button type="button" class="btn btn--ghost" data-admin="cancel">Cancelar</button>
                ${isNew ? '' : '<button type="button" class="btn btn--ghost btn--danger" data-admin="delete">Borrar</button>'}
            </div>
            <p class="comment-form__msg" data-form-msg role="status" aria-live="polite"></p>
        </form>`;
}

function renderPanel() {
    adminRoot().innerHTML = `
        <div class="admin">
            <aside class="admin-list" aria-label="Lista de cortos">${renderShortList()}</aside>
            <section class="admin-editor" aria-live="polite">${renderEditor()}</section>
        </div>`;
}

function refreshList() {
    const list = adminRoot().querySelector('.admin-list');
    if (list) list.innerHTML = renderShortList();
}

function openEditor(slug) {
    if (admin.dirty && !confirm('Hay cambios sin guardar. ¿Quieres descartarlos?')) return;
    admin.editing = slug;
    admin.dirty = false;
    renderPanel();
    const editor = adminRoot().querySelector('.admin-editor');
    if (slug !== null && window.matchMedia('(max-width: 899px)').matches) {
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    editor.querySelector('input[name="title"]')?.focus({ preventScroll: true });
}

function setFormMessage(text, type = 'info') {
    const message = adminRoot().querySelector('[data-form-msg]');
    if (!message) return;
    message.textContent = text;
    message.className = `comment-form__msg comment-form__msg--${type}`;
}

function setImageValue(form, name, value) {
    const field = form.querySelector(`[data-image-field="${name}"]`);
    form.elements[name].value = value;
    const preview = field.querySelector('.image-field__preview');
    preview.classList.remove('media--missing');
    preview.innerHTML = value ? `<img src="${escapeHTML(value)}" alt="" onerror="handleImageError(this)">` : '';
    field.querySelector('[data-admin="clear-image"]').hidden = !value;
}

// Lee y comprueba el formulario. Devuelve { values } o { error, field }.
function readForm(form) {
    const isNew = admin.editing === '';
    const get = name => form.elements[name].value.trim();
    const values = {
        title: get('title'),
        year: get('year') ? Number(get('year')) : null,
        genre: get('genre'),
        synopsis: get('synopsis'),
        movie: get('movie'),
        trailer: get('trailer'),
        thumbnail: get('thumbnail'),
        poster: get('poster'),
        ...(hasBackdropColumn() ? { backdrop: get('backdrop') } : {}),
        published: form.elements.published.checked,
        laurels: []
    };

    if (!values.title) return { error: 'Escribe el título del corto.', field: 'title' };

    if (isNew) {
        values.slug = get('slug') || slugify(values.title);
        if (!SLUG_PATTERN.test(values.slug)) {
            return { error: 'El identificador solo puede tener minúsculas, números y guiones (sin espacios ni tildes).', field: 'slug' };
        }
        if (admin.shorts.some(s => s.slug === values.slug)) {
            return { error: 'Ya existe un corto con ese identificador. Escribe otro distinto.', field: 'slug' };
        }
    }

    if (values.year !== null && (!Number.isInteger(values.year) || values.year < 1900 || values.year > 2100)) {
        return { error: 'El año debe ser un número entre 1900 y 2100 (o déjalo vacío).', field: 'year' };
    }

    for (const name of ['movie', 'trailer']) {
        if (values[name] && !toYouTubeEmbed(values[name])) {
            return { error: 'Ese enlace no parece de un vídeo de YouTube. Copia el enlace desde "Compartir" en YouTube.', field: name };
        }
        if (values[name] && !values[name].startsWith('https://')) {
            return { error: 'Los enlaces de vídeo deben empezar por https://', field: name };
        }
    }

    for (const name of ['thumbnail', 'poster', 'backdrop']) {
        if (name in values && !IMAGE_PATTERN.test(values[name])) {
            return { error: 'La imagen debe ser una ruta como img/archivo.png o un enlace https:// (sin espacios ni comillas).', field: name };
        }
    }

    const rows = [...form.querySelectorAll('.laurel-row')];
    for (const row of rows) {
        const type = row.querySelector('[name="laurel-type"]').value.trim();
        const name = row.querySelector('[name="laurel-name"]').value.trim();
        if (!type && !name) continue;
        if (!name) return { error: 'Cada festival necesita un nombre (o quita la fila vacía).', element: row.querySelector('[name="laurel-name"]') };
        values.laurels.push(type ? { type, name } : { name });
    }

    return { values };
}

async function saveShort(form) {
    if (admin.busy) return;
    const result = readForm(form);
    if (result.error) {
        setFormMessage(result.error, 'error');
        (result.element || form.elements[result.field])?.focus();
        return;
    }

    const isNew = admin.editing === '';
    const { values } = result;
    const submit = form.querySelector('[type="submit"]');
    const label = submit.textContent;
    admin.busy = true;
    submit.disabled = true;
    submit.textContent = 'Guardando…';
    setFormMessage('');

    try {
        let query;
        if (isNew) {
            const top = admin.shorts.length ? Math.min(...admin.shorts.map(s => s.position)) : 10;
            query = sb.from('shorts').insert({ ...values, position: top - 10 });
        } else {
            const { slug, ...changes } = values;
            query = sb.from('shorts').update(changes).eq('slug', admin.editing);
        }
        const { data, error } = await query.select(ADMIN_FIELDS).single();
        if (error) throw error;

        if (isNew) admin.shorts.unshift(data);
        else admin.shorts = admin.shorts.map(s => (s.slug === data.slug ? data : s));
        admin.shorts.sort((a, b) => a.position - b.position);
        admin.editing = data.slug;
        admin.dirty = false;
        renderPanel();
        setFormMessage(data.published
            ? 'Guardado. Ya se ve en la web (si tenías la web abierta, recárgala).'
            : 'Guardado. Está oculto: no aparece en la web hasta que marques "Publicado".', 'success');
        showToast(isNew ? `Corto «${data.title}» creado.` : 'Cambios guardados.', 'success');
    } catch (error) {
        console.warn('[PLMRN] Error al guardar el corto:', error);
        setFormMessage(adminErrorMessage(error), 'error');
        submit.disabled = false;
        submit.textContent = label;
    } finally {
        admin.busy = false;
    }
}

async function deleteShort() {
    const short = admin.shorts.find(s => s.slug === admin.editing);
    if (!short || admin.busy) return;
    const ok = confirm(
        `¿Borrar «${short.title}» para siempre?\n\n` +
        'Si solo quieres quitarlo de la web, cancela y desmarca "Publicado".\n' +
        'Las valoraciones y comentarios no se borran: si vuelves a crear un corto con el mismo identificador, reaparecerán.'
    );
    if (!ok) return;

    admin.busy = true;
    try {
        const { data, error } = await sb.from('shorts').delete().eq('slug', short.slug).select('slug');
        if (error) throw error;
        if (!data?.length) throw { code: '42501' };
        admin.shorts = admin.shorts.filter(s => s.slug !== short.slug);
        admin.editing = null;
        admin.dirty = false;
        renderPanel();
        showToast(`Corto «${short.title}» borrado.`, 'info');
    } catch (error) {
        console.warn('[PLMRN] Error al borrar el corto:', error);
        setFormMessage(adminErrorMessage(error), 'error');
    } finally {
        admin.busy = false;
    }
}

// Mueve un corto una posición arriba o abajo y renumera el orden (10, 20, 30…).
async function moveShort(slug, direction) {
    if (admin.busy) return;
    const list = [...admin.shorts];
    const from = list.findIndex(s => s.slug === slug);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];

    const changes = list
        .map((short, index) => ({ short, position: (index + 1) * 10 }))
        .filter(({ short, position }) => short.position !== position);

    const previous = admin.shorts;
    admin.busy = true;
    admin.shorts = list.map((short, index) => ({ ...short, position: (index + 1) * 10 }));
    refreshList();
    adminRoot().querySelector(`[data-admin="${direction < 0 ? 'up' : 'down'}"][data-slug="${CSS.escape(slug)}"]`)?.focus();

    try {
        const results = await Promise.all(changes.map(({ short, position }) =>
            sb.from('shorts').update({ position }).eq('slug', short.slug)));
        const failed = results.find(r => r.error);
        if (failed) throw failed.error;
    } catch (error) {
        console.warn('[PLMRN] Error al cambiar el orden:', error);
        admin.shorts = previous;
        refreshList();
        showToast(adminErrorMessage(error), 'error');
    } finally {
        admin.busy = false;
    }
}

async function handleUpload(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const form = input.closest('form');
    const name = input.dataset.upload;
    const slug = admin.editing || form.elements.slug.value.trim() || slugify(form.elements.title.value);
    const button = input.closest('.image-field__upload');

    button.classList.add('is-busy');
    setFormMessage('Subiendo imagen…', 'info');
    try {
        const url = await uploadImage(file, slug, name);
        setImageValue(form, name, url);
        admin.dirty = true;
        setFormMessage('Imagen subida. Pulsa "Guardar" para aplicar el cambio.', 'success');
    } catch (error) {
        console.warn('[PLMRN] Error al subir la imagen:', error);
        setFormMessage(adminErrorMessage(error), 'error');
    } finally {
        button.classList.remove('is-busy');
    }
}

// ---------- Eventos ----------

function bindPanelEvents() {
    const root = adminRoot();

    root.addEventListener('click', (event) => {
        const action = event.target.closest('[data-admin]');
        if (!action || action.disabled) return;
        const form = root.querySelector('.admin-form');

        switch (action.dataset.admin) {
            case 'new': openEditor(''); break;
            case 'edit': if (action.dataset.slug !== admin.editing) openEditor(action.dataset.slug); break;
            case 'cancel': openEditor(null); break;
            case 'delete': deleteShort(); break;
            case 'up': moveShort(action.dataset.slug, -1); break;
            case 'down': moveShort(action.dataset.slug, 1); break;
            case 'add-laurel': {
                const box = form.querySelector('[data-laurels]');
                box.insertAdjacentHTML('beforeend', renderLaurelRow());
                box.lastElementChild.querySelector('input').focus();
                admin.dirty = true;
                break;
            }
            case 'remove-laurel':
                action.closest('.laurel-row').remove();
                admin.dirty = true;
                break;
            case 'clear-image':
                setImageValue(form, action.dataset.name, '');
                admin.dirty = true;
                break;
        }
    });

    root.addEventListener('input', (event) => {
        const form = event.target.closest('.admin-form');
        if (!form) return;
        admin.dirty = true;
        const { name } = event.target;

        // En un corto nuevo, el identificador sigue al título hasta que se edita a mano.
        if (name === 'title' && admin.editing === '' && !form.elements.slug.dataset.touched) {
            form.elements.slug.value = slugify(event.target.value);
        }
        if (name === 'slug') form.elements.slug.dataset.touched = 'true';
        if (name === 'synopsis') form.querySelector('[data-counter]').textContent = event.target.value.length;
        if (name === 'thumbnail' || name === 'poster' || name === 'backdrop') {
            clearTimeout(event.target.previewTimer);
            event.target.previewTimer = setTimeout(() => {
                const value = event.target.value.trim();
                if (IMAGE_PATTERN.test(value)) setImageValue(form, name, value);
            }, 500);
        }
    });

    root.addEventListener('change', (event) => {
        if (event.target.matches('[data-upload]')) handleUpload(event.target);
    });

    root.addEventListener('submit', (event) => {
        event.preventDefault();
        saveShort(event.target);
    });

    window.addEventListener('beforeunload', (event) => {
        if (admin.dirty) event.preventDefault();
    });
}

// ---------- Arranque ----------

async function showPanelFor(user) {
    admin.userId = user.id;
    renderAdminMessage('Comprobando permisos…', 'Un momento.');

    const { data: isAdmin, error } = await sb.rpc('is_admin');
    if (admin.userId !== user.id) return; // la sesión cambió mientras tanto
    if (error) {
        console.warn('[PLMRN] Error al comprobar permisos:', error);
        renderAdminMessage('No se ha podido abrir el panel', escapeHTML(adminErrorMessage(error)));
        return;
    }
    if (!isAdmin) {
        renderAdminMessage(
            'Esta cuenta no es de administrador',
            `Has entrado como <strong>${escapeHTML(getCurrentUsername() || 'usuario')}</strong>, que no tiene permiso para editar el catálogo. ` +
            'Para dar permiso a una cuenta, sigue el paso 4 ("Darte permiso de administrador") de supabase/README.md.',
            '<button type="button" class="btn btn--ghost" data-auth-logout>Entrar con otra cuenta</button>'
        );
        return;
    }

    try {
        admin.shorts = await fetchAllShorts();
    } catch (error) {
        console.warn('[PLMRN] Error al cargar los cortos:', error);
        renderAdminMessage('No se han podido cargar los cortos', escapeHTML(adminErrorMessage(error)));
        return;
    }
    if (admin.userId !== user.id) return;
    admin.editing = null;
    admin.dirty = false;
    renderPanel();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!SUPABASE_ENABLED) {
        renderAdminMessage('Panel no disponible', 'Supabase no está configurado en js/config.js.');
        return;
    }
    bindPanelEvents();

    onAuthChange((user) => {
        admin.dirty = false;
        if (!user) {
            admin.userId = null;
            renderAdminMessage(
                'Inicia sesión',
                'Entra con tu cuenta de administrador para gestionar los cortos.',
                '<button type="button" class="btn" data-auth-open="login" data-auth-reason="Entra con tu cuenta de administrador.">Iniciar sesión</button>'
            );
            return;
        }
        showPanelFor(user);
    });
});
