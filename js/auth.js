// Cuentas de usuario con Supabase Auth (nombre de usuario + contraseña):
// cliente de Supabase, zona de cuenta en la cabecera y ventana de acceso/registro.
// La sesión la guarda supabase-js en el navegador, así que sigue activa al recargar.
//
// Supabase exige un email en cada cuenta, así que se usa uno interno que
// nunca recibe correos: <usuario>@usuarios.plmrn.invalid
// (en Supabase hay que tener desactivado "Confirm email", ver supabase/README.md).

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
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const USERNAME_EMAIL_DOMAIN = 'usuarios.plmrn.invalid';

let currentUser = null;
let currentUsername = null;
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

function getCurrentUsername() {
    return currentUsername;
}

// Email interno de una cuenta. Las cuentas antiguas creadas con email
// pueden seguir entrando escribiendo su email en vez del usuario.
function loginToEmail(login) {
    return login.includes('@') ? login : `${login.toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

async function loadUsername(user) {
    if (!user) return null;
    const { data, error } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
    if (error) console.warn('[PLMRN] No se pudo cargar el perfil:', error);
    return data?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario';
}

// ---------- Mensajes de error comprensibles ----------

function authErrorMessage(error) {
    const code = error?.code || '';
    const text = (error?.message || '').toLowerCase();

    if (code === 'invalid_credentials' || text.includes('invalid login credentials')) {
        return 'Usuario o contraseña incorrectos.';
    }
    if (code === 'user_already_exists' || code === 'email_exists' || text.includes('already registered')) {
        return 'Ese nombre de usuario ya está en uso. Elige otro.';
    }
    if (code === 'weak_password' || text.includes('password should')) {
        return `La contraseña es demasiado débil. Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
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

    const name = currentUsername || 'Tu cuenta';
    box.innerHTML = `
        <span class="account__user" title="${escapeHTML(name)}">
            <span class="account__avatar" aria-hidden="true">${escapeHTML(name.charAt(0).toUpperCase())}</span>
            <span class="account__email"><span class="sr-only">Sesión iniciada como </span>${escapeHTML(name)}</span>
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
                <span class="field__label">Nombre de usuario</span>
                <input type="text" name="username" autocomplete="username" autocapitalize="none"
                    spellcheck="false" maxlength="60" required>
                <span class="field__hint" data-signup-only hidden>De 3 a 20 caracteres: letras, números o _ (sin espacios). Será tu nombre público.</span>
            </label>
            <label class="field">
                <span class="field__label">Contraseña</span>
                <span class="field__password">
                    <input type="password" name="password" autocomplete="current-password" minlength="${MIN_PASSWORD_LENGTH}" required>
                    <button type="button" class="field__toggle" data-auth-toggle-password aria-pressed="false">Mostrar</button>
                </span>
                <span class="field__hint" data-signup-only hidden>Mínimo ${MIN_PASSWORD_LENGTH} caracteres. Guárdala bien: no se puede recuperar por email.</span>
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
    dialog.querySelector('input[name="username"]').focus();
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const login = form.username.value.trim();
    const password = form.password.value;
    const submit = form.querySelector('.auth-form__submit');
    const isSignup = authMode === 'signup';

    if (!login) {
        setAuthMessage('Escribe tu nombre de usuario.', 'error');
        form.username.focus();
        return;
    }
    if (isSignup && !USERNAME_PATTERN.test(login)) {
        setAuthMessage('El nombre de usuario debe tener de 3 a 20 caracteres: letras, números o _ (sin espacios ni tildes).', 'error');
        form.username.focus();
        return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        setAuthMessage(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, 'error');
        form.password.focus();
        return;
    }

    const originalLabel = submit.textContent;
    submit.disabled = true;
    submit.textContent = isSignup ? 'Creando cuenta…' : 'Entrando…';
    setAuthMessage('');

    try {
        if (isSignup) {
            const { data: available, error: checkError } = await sb.rpc('username_available', { p_username: login });
            if (checkError) throw checkError;
            if (!available) {
                setAuthMessage('Ese nombre de usuario ya está en uso. Elige otro.', 'error');
                form.username.focus();
                return;
            }

            const { data, error } = await sb.auth.signUp({
                email: loginToEmail(login),
                password,
                options: { data: { username: login } }
            });
            if (error) throw error;

            if (!data.session) {
                // Pasa si en Supabase sigue activado "Confirm email".
                console.error('[PLMRN] Supabase no ha iniciado la sesión tras el registro: desactiva "Confirm email" en Authentication → Sign In / Providers → Email.');
                setAuthMessage('No se ha podido completar el registro. Inténtalo más tarde.', 'error');
                return;
            }

            form.reset();
            getAuthDialog().close();
            showToast(`¡Cuenta creada! Bienvenido/a, ${login}.`, 'success');
        } else {
            const { error } = await sb.auth.signInWithPassword({ email: loginToEmail(login), password });
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

    sb.auth.onAuthStateChange((event, session) => {
        const previousId = currentUser?.id;
        const user = session?.user ?? null;
        const firstEvent = !authReady;
        currentUser = user;

        // Se sale del callback antes de llamar a Supabase: así no hay bloqueos.
        setTimeout(async () => {
            if (firstEvent || previousId !== user?.id) {
                const username = await loadUsername(user);
                if (currentUser?.id !== user?.id) return; // la sesión cambió mientras tanto
                currentUsername = username;
                authReady = true;
                renderAccount();
                authListeners.forEach(callback => callback(currentUser));
            }
        }, 0);
    });
});
