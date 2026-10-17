// Etappe 6b: Push-Benachrichtigungen abonnieren (Android/Chrome). Der Versand passiert in der
// Edge Function supabase/functions/notify.
import { VAPID_PUBLIC_KEY, pushConfigured } from './config.js';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Fragt nach Erlaubnis, abonniert und speichert das Abo in Supabase. */
export async function enablePush() {
  if (!pushConfigured()) throw new Error('Benachrichtigungen sind noch nicht eingerichtet.');
  if (!pushSupported()) throw new Error('Dieses Gerät unterstützt keine Benachrichtigungen.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
  const json = sub.toJSON();
  const { getClient, currentSession } = await import('./sync.js');
  const c = await getClient();
  const session = await currentSession();
  const { error } = await c.from('push_subscriptions').upsert({ user_id: session.user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
  return true;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    const { getClient } = await import('./sync.js');
    const c = await getClient();
    await c.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch (e) { console.warn(e); }
  await sub.unsubscribe();
}
