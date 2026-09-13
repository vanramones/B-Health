/**
 * Push Notification Service (FCM Remote Push)
 * ------------------------------------------------------------------
 * Registers the device with Firebase Cloud Messaging, stores the FCM
 * token in Supabase (device_tokens), and handles incoming pushes.
 *
 * Remote push is what lets the user receive a notification the moment
 * the admin saves a vaccination record — EVEN when the app is fully
 * closed — because Google (FCM) delivers it, not the app itself.
 *
 * Native only (Android/iOS via Capacitor). On the browser this is a
 * no-op; the local-notification fallback still applies there.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../config/supabase';
import { navigateFromNotification } from '../utils/notificationNav';

class PushNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.registered = false;
    this.currentUserId = null;
  }

  /**
   * Initialize push for the given logged-in user id.
   * Call this right after a user logs in / on app start.
   */
  async register(userId) {
    if (!this.isNative) {
      console.log('[Push] Not a native platform — skipping FCM registration.');
      return;
    }
    if (!userId) {
      console.warn('[Push] No userId provided — cannot register token.');
      return;
    }
    this.currentUserId = userId;

    try {
      // Ask permission (Android 13+ shows the native dialog here)
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== 'granted') {
        console.warn('[Push] Permission not granted:', perm.receive);
        return;
      }

      await this.ensureChannel();
      this.attachListeners();

      // Triggers the 'registration' listener with the FCM token
      await PushNotifications.register();
      this.registered = true;
      console.log('[Push] register() called — waiting for token…');
    } catch (e) {
      console.error('[Push] register failed:', e?.message || e);
    }
  }

  /**
   * Ensure a HIGH-importance Android channel exists so notifications appear
   * as a heads-up banner at the top of the screen (Android 8+ requires it).
   */
  async ensureChannel() {
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await LocalNotifications.createChannel({
        id: 'vaccination-reminders',
        name: 'B-Health Notifications',
        description: 'Vaccinations, appointments and announcements',
        importance: 5, // HIGH — heads-up banner + sound
        visibility: 1,
        vibration: true,
      });
    } catch (e) {
      console.warn('[Push] ensureChannel failed:', e?.message || e);
    }
  }

  attachListeners() {
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    // Fired once we receive an FCM token — save it to Supabase
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] FCM token received');
      await this.saveToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] registration error:', err?.error || err);
    });

    // App in FOREGROUND and a push arrives. Android does NOT show a system
    // banner automatically in this case, so we mirror it into a local
    // notification (HIGH-importance channel) to surface a heads-up banner.
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('[Push] received in foreground:', notification?.title);
      try {
        const route = notification?.data?.route || '/user/vaccinations';
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 2147483647),
              channelId: 'vaccination-reminders',
              title: notification?.title || 'B-Health',
              body: notification?.body || '',
              extra: { route },
              schedule: { at: new Date(Date.now() + 200) },
            },
          ],
        });
      } catch (e) {
        console.warn('[Push] foreground banner failed:', e?.message || e);
      }
    });

    // User TAPPED the notification — navigate to the relevant page.
    // (Taps on the foreground-mirrored LOCAL banner are handled by
    // vaccinationReminderService's single localNotificationActionPerformed
    // listener, which reads the same `extra.route`.)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const route = action?.notification?.data?.route || '/user/vaccinations';
      navigateFromNotification(route);
    });
  }

  /**
   * Persist the FCM token in Supabase via the register_device_token RPC.
   */
  async saveToken(token) {
    if (!token || !this.currentUserId) return;
    try {
      const { error } = await supabase.rpc('register_device_token', {
        p_user_id: Number(this.currentUserId),
        p_token: token,
        p_platform: Capacitor.getPlatform(),
      });
      if (error) {
        console.error('[Push] saveToken RPC error:', error.message);
      } else {
        console.log('[Push] token saved to Supabase');
      }
    } catch (e) {
      console.error('[Push] saveToken failed:', e?.message || e);
    }
  }

  /**
   * Remove the listeners (e.g. on logout).
   */
  async unregister() {
    if (!this.isNative) return;
    try {
      await PushNotifications.removeAllListeners();
      this._listenersAttached = false;
      this.registered = false;
    } catch { /* ignore */ }
  }
}

const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
