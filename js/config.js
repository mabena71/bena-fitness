// Zugang zu Supabase (Etappe 3). Solange beide Werte leer sind, ist der Login ausgeschaltet
// und die App speichert nur auf dem Gerät.
// Der "anon key" ist für den Browser gedacht und darf hier stehen; den geheimen
// "service_role key" niemals eintragen.
export const SUPABASE_URL = 'https://slvrawfomzgmyytzdnfx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdnJhd2ZvbXpnbXl5dHpkbmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODQ1ODYsImV4cCI6MjEwNzg2MDU4Nn0.6gjonj0VKiW2O1h-TG4oq08_-vaSfCtzkXDD-65g-lA';

// Öffentlicher VAPID-Schlüssel für Push-Benachrichtigungen (der private liegt nur in Supabase-Secrets)
export const VAPID_PUBLIC_KEY = 'BBNF_BFkbijbzbQ4eowGfKFTpuGx62dq_IWgqfATs-i2Qo0LIKFTIXJr9135B61_dZb-UKNWAqLIBgu-mC-W7cM';

export const cloudConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const pushConfigured = () => cloudConfigured() && !!VAPID_PUBLIC_KEY;
