// Anmeldung für Freunde (Nr. 26): reine Hilfsfunktionen für Einladungscodes und
// Rücksprünge aus Supabase-Mails (Bestätigung, Passwort vergessen). Ohne DOM, getestet in tests.js.

// 8 Zeichen ohne verwechselbare Zeichen (kein I, O, 0, 1). Gleiches Alphabet wie in supabase/invites.sql.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;
export const INVITE_DAYS = 14;
export const APP_URL = 'https://mabena71.github.io/bena-fitness/';

/** Eingabe vereinheitlichen: Grossbuchstaben, ohne Leerzeichen und Bindestriche. */
export function normalizeCode(s) {
  return String(s || '').toUpperCase().replace(/[\s\-_.]/g, '');
}

export function isValidCode(s) {
  const c = normalizeCode(s);
  return c.length === CODE_LENGTH && [...c].every(ch => CODE_ALPHABET.includes(ch));
}

/** Zum Vorlesen und Abtippen in zwei Vierergruppen: ABCD-EFGH. */
export function formatCode(s) {
  const c = normalizeCode(s);
  return c.length === CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Link, der direkt die Registrierung mit ausgefülltem Code öffnet. */
export function inviteLink(code, base = APP_URL) {
  return `${base}#/login?code=${normalizeCode(code)}`;
}

/** Code aus dem Hash der App lesen (#/login?code=XXXX). */
export function codeFromHash(hash) {
  const q = new URLSearchParams(String(hash || '').split('?')[1] || '');
  return normalizeCode(q.get('code'));
}

/** Zustand einer Einladung: offen, verwendet oder abgelaufen. */
export function inviteState(inv, now = new Date()) {
  if (inv.used_at) return 'verwendet';
  return new Date(inv.expires_at) <= new Date(now) ? 'abgelaufen' : 'offen';
}

/** Ganze Tage bis zum Ablauf (aufgerundet, nie unter 0). */
export function daysLeft(expiresAt, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(expiresAt) - new Date(now)) / 86400000));
}

/** Text zum Teilen per WhatsApp & Co. */
export function shareText(code, name = '') {
  return `${name ? `${name} lädt dich` : 'Ich lade dich'} zu BenaFit ein, dem Trainingstagebuch fürs Fitnessstudio. ` +
    `Mit diesem Link kannst du dich registrieren (Code ${formatCode(code)}, ${INVITE_DAYS} Tage gültig):\n${inviteLink(code)}`;
}

/**
 * Rücksprung aus einer Supabase-Mail erkennen.
 * - Standard-Vorlage: …/#access_token=…&refresh_token=…&type=recovery|signup
 * - Eigene Vorlage:   …/?token_hash=…&type=recovery|signup|email
 * - Fehler:           …/#error=…&error_code=otp_expired&error_description=…
 * Gibt null zurück, wenn es kein Rücksprung ist (z. B. normaler Hash #/settings).
 */
export function parseAuthRedirect(hash, search) {
  const h = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const s = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const errDesc = h.get('error_description') || s.get('error_description');
  if (h.get('error') || s.get('error') || errDesc) {
    const code = h.get('error_code') || s.get('error_code') || '';
    return { kind: 'error', code, message: code === 'otp_expired' ? 'Der Link ist abgelaufen oder wurde schon benutzt. Bitte neu anfordern.' : (errDesc || 'Der Link funktioniert nicht.') };
  }
  if (h.get('access_token') && h.get('refresh_token')) {
    return { kind: 'session', type: h.get('type') || 'signup', access_token: h.get('access_token'), refresh_token: h.get('refresh_token') };
  }
  if (s.get('token_hash') && s.get('type')) return { kind: 'otp', type: s.get('type'), token_hash: s.get('token_hash') };
  return null;
}

/** Fehlermeldungen von Supabase Auth in verständliches Deutsch. */
export function authErrorText(msg) {
  const m = String(msg || '');
  if (/Database error saving new user/i.test(m)) return 'Der Einladungscode ist ungültig, abgelaufen oder schon verwendet.';
  if (/already registered|already been registered/i.test(m)) return 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.';
  if (/Signups not allowed/i.test(m)) return 'Die Registrierung ist noch nicht freigeschaltet.';
  if (/Email address not authorized/i.test(m)) return 'Der E-Mail-Versand ist noch nicht eingerichtet. Bitte die Person fragen, die dich eingeladen hat.';
  if (/rate limit/i.test(m)) return 'Zu viele Versuche oder E-Mails. Bitte in einer Stunde nochmals versuchen.';
  if (/Password should be|weak password/i.test(m)) return 'Das Passwort ist zu schwach (mindestens 8 Zeichen).';
  if (/invalid.*email|Unable to validate email/i.test(m)) return 'Die E-Mail-Adresse ist ungültig.';
  if (/Email not confirmed/i.test(m)) return 'Bitte zuerst den Link in der Bestätigungs-Mail antippen.';
  if (/Invalid login credentials/i.test(m)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/same.*password|should be different/i.test(m)) return 'Das neue Passwort muss sich vom alten unterscheiden.';
  return m;
}

/** Antwort von check_signup_invite() als Satz (null = gültig). */
export function inviteCheckText(state) {
  if (state === 'ok') return null;
  return {
    unbekannt: 'Diesen Einladungscode gibt es nicht. Bitte genau abtippen.',
    verwendet: 'Dieser Einladungscode wurde schon verwendet. Bitte um einen neuen.',
    abgelaufen: `Dieser Einladungscode ist abgelaufen (${INVITE_DAYS} Tage gültig). Bitte um einen neuen.`,
  }[state] ?? 'Der Einladungscode konnte nicht geprüft werden.';
}
