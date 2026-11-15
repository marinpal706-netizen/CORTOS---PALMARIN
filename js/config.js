// ==========================================
// CONFIGURACIÓN DE SUPABASE (valoraciones)
// ==========================================
// Pega aquí los datos de tu proyecto (Supabase → Project Settings → API).
// La clave "anon" / "publishable" es pública: está pensada para ir en la web.
// NUNCA pongas aquí la clave "service_role" / "secret".
// Mientras estén vacías, la web funciona igual pero sin valoraciones.
const SUPABASE_URL = 'https://cohizgnbpmapwccbpesv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_onFYM07k7RCsXfvvZj8Y1A_puu2OCAk';

// ==========================================
// CAPTCHA (Cloudflare Turnstile) al crear cuenta e iniciar sesión
// ==========================================
// Pega aquí la "Site Key" de tu widget de Turnstile (es pública).
// La "Secret Key" va SOLO en Supabase, nunca aquí (ver supabase/README.md).
// Mientras esté vacía, no se pide captcha.
const CAPTCHA_SITE_KEY = '0x4AAAAAAGCRfPiaddOCrue1';
