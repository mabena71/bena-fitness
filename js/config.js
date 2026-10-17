// Zugang zu Supabase (Etappe 3). Solange beide Werte leer sind, ist der Login ausgeschaltet
// und die App speichert nur auf dem Gerät.
// Der "anon key" ist für den Browser gedacht und darf hier stehen; den geheimen
// "service_role key" niemals eintragen.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Öffentlicher VAPID-Schlüssel für Push-Benachrichtigungen (der private liegt nur in Supabase-Secrets)
export const VAPID_PUBLIC_KEY = '';

export const cloudConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const pushConfigured = () => cloudConfigured() && !!VAPID_PUBLIC_KEY;
