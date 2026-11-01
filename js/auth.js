// Cuentas de usuario con Supabase Auth (email + contraseña):
// cliente de Supabase, zona de cuenta en la cabecera y ventana de acceso/registro.
// La sesión la guarda supabase-js en el navegador, así que sigue activa al recargar.

// Enlaces de confirmación de email: Supabase vuelve con datos en la URL (#...).
// Se leen antes de crear el cliente, que los borra de la dirección.
const authRedirect = new URLSearchParams(location.hash.slice(1));
const cameFromEmailLink = authRedirect.has('access_token') || new URLSearchParams(location.search).has('code');
const emailLinkError = authRedirect.get('error_description');

const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY && window.supabase?.createClient);

const sb = SUPABASE_ENABLED
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
    : null;

if (!SUPABASE_ENABLED) {
    console.info('[PLMRN] Cuentas y valoraciones desactivadas: rellena js/config.js con los datos de Supabase.');
}

const MIN_PASSWORD_LENGTH = 6;

let currentUser = null;
let authReady = false;
const authListeners = [];

// Permite a otras partes de la web reaccionar al iniciar/cerrar sesión.
function onAuthChange(callback) {
    authListeners.push(callback);
    if (authReady) callback(currentUser);
}

function getCurrentUser() {
    return currentUser;
}

// ---------- Mensajes de error comprensibles ----------

function authErrorMessage(error) {
    const code = error?.code || '';
    const text = (error?.message || '').toLowerCase();

    if (code === 'invalid_credentials' || text.includes('invalid login credentials')) {
        return 'Email o contraseña incorrectos.';
    }
    if (code === 'email_not_confirmed' || text.includes('email not confirmed')) {
        return 'Tienes que confirmar tu email antes de entrar. Revisa tu bandeja de entrada (y la carpeta de spam).';
    }
    if (code === 'user_already_exists' || code === 'email_exists' || text.includes('already registered')) {
        return 'Ya existe una cuenta con este email. Inicia sesión.';
    }
    if (code === 'weak_password' || text.includes('password should')) {
        return `La contraseña es demasiado débil. Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (code === 'email_address_invalid' || text.includes('invalid format')) {
        return 'Ese email no es válido.';
    }
    if (code.startsWith('over_') || error?.status === 429) {
        return 'Demasiados intentos. Espera un momento y vuelve a probar.';
    }
    if (code === 'signup_disabled') {
        return 'El registro de nuevas cuentas está desactivado ahora mismo.';
    }
    if (error?.name === 'AuthRetryableFetchError' || text.includes('failed to fetch')) {
        return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.';
    }
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

// ---------- Zona de cuenta en la cabecera ----------

function renderAccount() {
    const box = document.getElementById('account');
    if (!box) return;

    if (!authReady) {
        box.innerHTML = '';
        return;
    }

    if (!currentUser) {
        box.innerHTML = `<button type="button" class="btn btn--sm" data-auth-open="login">Entrar</button>`;
        return;
    }

    const email = currentUser.email || 'Tu cuenta';
    box.innerHTML = `
        <span class="account__user" title="${escapeHTML(email)}">
            <span class="account__avatar" aria-hidden="true">${escapeHTML(email.charAt(0).toUpperCase())}</span>
            <span class="account__email"><span class="sr-only">Sesión iniciada como </span>${escapeHTML(email)}</span>
        </span>
        <button type="button" class="btn btn--sm btn--ghost" data-auth-logout>Cerrar sesión</button>`;
}

async function logout() {
    const { error } = await sb.auth.signOut();
    if (error) {
        showToast('No se ha podido cerrar la sesión. Inténtalo de nuevo.', 'error');
    } else {
        showToast('Has cerrado sesión.', 'info');
    }
}

// ---------- Ventana de acceso / registro ----------

let authMode = 'login';

function createAuthDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'auth-dialog';
    dialog.className = 'auth-dialog';
    dialog.setAttribute('aria-labelledby', 'auth-title');
    dialog.innerHTML = `
        <button type="button" class="auth-dialog__close" data-auth-close aria-label="Cerrar">×</button>
        <h2 id="auth-title" class="auth-dialog__title">Inicia sesión</h2>
        <p class="auth-dialog__reason" hidden></p>

        <div class="auth-switch" role="group" aria-label="Tipo de acceso">
            <button type="button" data-auth-mode="login" aria-pressed="true">Iniciar sesión</button>
            <button type="button" data-auth-mode="signup" aria-pressed="false">Crear cuenta</button>
        </div>

        <form class="auth-form" novalidate>
            <label class="field">
                <span class="field__label">Email</span>
                <input type="email" name="email" autocomplete="email" inputmode="email" required>
            </label>
            <label class="field">
                <span class="field__label">Contraseña</span>
                <span class="field__password">
                    <input type="password" name="password" autocomplete="current-password" minlength="${MIN_PASSWORD_LENGTH}" required>
                    <button type="button" class="field__toggle" data-auth-toggle-password aria-pressed="false">Mostrar</button>
                </span>
                <span class="field__hint" data-signup-only hidden>Mínimo ${MIN_PASSWORD_LENGTH} caracteres.</span>
            </label>
            <button type="submit" class="btn auth-form__submit">Iniciar sesión</button>
            <p class="auth-form__msg" role="status" aria-live="polite"></p>
        </form>`;
    document.body.appendChild(dialog);

    dialog.querySelector('.auth-form').addEventListener('submit', handleAuthSubmit);

    // Cerrar al pulsar fuera de la ventana.
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });

    return dialog;
}

function getAuthDialog() {
    return document.getElementById('auth-dialog') || createAuthDialog();
}

function setAuthMessage(text, type = 'info') {
    const message = getAuthDialog().querySelector('.auth-form__msg');
    message.textContent = text;
    message.className = `auth-form__msg auth-form__msg--${type}`;
}

function setAuthMode(mode) {
    authMode = mode;
    const dialog = getAuthDialog();
    const isSignup = mode === 'signup';

    dialog.querySelector('.auth-dialog__title').textContent = isSignup ? 'Crea tu cuenta' : 'Inicia sesión';
    dialog.querySelector('.auth-form__submit').textContent = isSignup ? 'Crear cuenta' : 'Iniciar sesión';
    dialog.querySelector('input[name="password"]').autocomplete = isSignup ? 'new-password' : 'current-password';
    dialog.querySelectorAll('[data-signup-only]').forEach(el => { el.hidden = !isSignup; });
    dialog.querySelectorAll('[data-auth-mode]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.authMode === mode));
    });
    setAuthMessage('');
}

// reason: texto opcional que explica por qué se pide iniciar sesión.
function openAuthDialog(mode = 'login', reason = '') {
    if (!SUPABASE_ENABLED) return;
    const dialog = getAuthDialog();
    setAuthMode(mode);

    const reasonBox = dialog.querySelector('.auth-dialog__reason');
    reasonBox.textContent = reason;
    reasonBox.hidden = !reason;

    if (!dialog.open) dialog.showModal();
    dialog.querySelector('input[name="email"]').focus();
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const submit = form.querySelector('.auth-form__submit');

    if (!form.email.checkValidity() || !email) {
        setAuthMessage('Introduce un email válido.', 'error');
        form.email.focus();
        return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        setAuthMessage(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, 'error');
        form.password.focus();
        return;
    }

    const originalLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = authMode === 'signup' ? 'Creando cuenta…' : 'Entrando…';
    setAuthMessage('');

    try {
        if (authMode === 'signup') {
            const { data, error } = await sb.auth.signUp({
                email,
                password,
                // Tras confirmar el email, Supabase devuelve al usuario a la portada.
                options: { emailRedirectTo: new URL('index.html', location.href).href }
            });
            if (error) throw error;

            // Con la confirmación de email activada, un email ya registrado
            // no da error pero llega sin identidades.
            if (data.user && data.user.identities?.length === 0) {
                setAuthMode('login');
                form.email.value = email;
                setAuthMessage('Ya existe una cuenta con este email. Inicia sesión.', 'error');
                return;
            }

            if (data.session) {
                getAuthDialog().close();
                showToast('¡Cuenta creada! Ya has iniciado sesión.', 'success');
            } else {
                form.reset();
                setAuthMessage('¡Cuenta creada! Te hemos enviado un email de confirmación. Ábrelo y después inicia sesión.', 'success');
            }
        } else {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            form.reset();
            getAuthDialog().close();
            showToast('¡Has iniciado sesión correctamente!', 'success');
        }
    } catch (error) {
        console.warn('[PLMRN] Error de autenticación:', error);
        setAuthMessage(authErrorMessage(error), 'error');
    } finally {
        submit.disabled = false;
        if (submit.textContent.endsWith('…')) submit.textContent = originalLabel;
    }
}

// ---------- Arranque ----------

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header .container');
    if (!SUPABASE_ENABLED || !header) return;

    const account = document.createElement('div');
    account.id = 'account';
    account.className = 'account';
    header.appendChild(account);

    // Delegación de clics: abrir ventana, cambiar modo, cerrar sesión, mostrar contraseña.
    document.addEventListener('click', (event) => {
        const open = event.target.closest('[data-auth-open]');
        if (open) openAuthDialog(open.dataset.authOpen, open.dataset.authReason || '');

        const mode = event.target.closest('[data-auth-mode]');
        if (mode) setAuthMode(mode.dataset.authMode);

        if (event.target.closest('[data-auth-close]')) getAuthDialog().close();
        if (event.target.closest('[data-auth-logout]')) logout();

        const toggle = event.target.closest('[data-auth-toggle-password]');
        if (toggle) {
            const input = toggle.previousElementSibling;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            toggle.textContent = show ? 'Ocultar' : 'Mostrar';
            toggle.setAttribute('aria-pressed', String(show));
        }
    });

    if (emailLinkError) {
        showToast('El enlace de confirmación no es válido o ha caducado. Inicia sesión o regístrate de nuevo.', 'error');
        history.replaceState(null, '', location.pathname + location.search);
    }

    sb.auth.onAuthStateChange((event, session) => {
        const previousId = currentUser?.id;
        currentUser = session?.user ?? null;
        const firstEvent = !authReady;
        authReady = true;

        // Se sale del callback antes de avisar al resto: así pueden llamar a Supabase sin bloqueos.
        setTimeout(() => {
            renderAccount();
            if (firstEvent && cameFromEmailLink && currentUser) {
                showToast('¡Email confirmado! Ya has iniciado sesión.', 'success');
            }
            if (firstEvent || previousId !== currentUser?.id) {
                authListeners.forEach(callback => callback(currentUser));
            }
        }, 0);
    });
});
