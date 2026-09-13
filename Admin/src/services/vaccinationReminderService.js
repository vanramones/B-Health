/**
 * Vaccination Reminder Service
 * Schedules native local notifications that fire even when the app is CLOSED.
 * Uses Capacitor Local Notifications on Android/iOS, falls back to Web Notifications on browser.
 */

import { userApi } from '../context/UserAuthContext';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { navigateFromNotification } from '../utils/notificationNav';

class VaccinationReminderService {
  constructor() {
    this.checkInterval = null;
    this.notificationPermission = 'default';
    this.CHECK_INTERVAL_MS = 60 * 60 * 1000; // Re-sync schedule every hour while open
    this.REMINDER_DAYS = [7, 3, 1, 0]; // Remind 7, 3, 1 days before and on the day
    this.isNative = Capacitor.isNativePlatform();
    this.visibilityHandler = null;
  }

  /**
   * Initialize the service
   */
  async init() {
    console.log('[VaccinationReminder] Initializing... (native:', this.isNative, ')');

    // Request notification permission
    this.notificationPermission = await this.requestNotificationPermission();

    if (this.isNative) {
      // Create a notification channel (Android 8+) and tap handler
      try {
        await LocalNotifications.createChannel({
          id: 'vaccination-reminders',
          name: 'Vaccination Reminders',
          description: 'Reminders for scheduled vaccinations',
          importance: 5, // HIGH - heads-up notification + sound
          visibility: 1,
          vibration: true,
        });
      } catch (e) {
        console.warn('[VaccinationReminder] createChannel failed:', e?.message);
      }

      // Handle notification tap -> open vaccinations page
      try {
        await LocalNotifications.removeAllListeners();
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const route = action?.notification?.extra?.route || '/user/vaccinations';
          navigateFromNotification(route);
        });
      } catch (e) {
        console.warn('[VaccinationReminder] addListener failed:', e?.message);
      }

      // Android 12+ requires a separate "exact alarm" permission for the
      // notification to fire AT THE EXACT scheduled time. Request it here.
      await this.ensureExactAlarmPermission();
    }

    // Re-sync the scheduled notifications now
    await this.syncScheduledNotifications();

    // Re-sync periodically while the app is open (in case data changes)
    this.startPeriodicCheck();

    // Re-sync whenever the app returns to the foreground (e.g. user reopens it).
    // This is the closest we can get to "instant" with local-only notifications:
    // any record the admin added while the app was closed gets scheduled the
    // moment the user opens/resumes the app.
    this.startForegroundSync();
  }

  /**
   * Re-sync scheduled notifications every time the app becomes visible again.
   * Works in both the Capacitor webview and the browser via `visibilitychange`.
   */
  startForegroundSync() {
    if (this.visibilityHandler) return; // already attached
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        console.log('[VaccinationReminder] App foregrounded -> re-syncing');
        this.syncScheduledNotifications();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Request notification permission (native or web)
   */
  async requestNotificationPermission() {
    if (this.isNative) {
      try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted' ? 'granted' : 'denied';
      } catch (e) {
        console.warn('[VaccinationReminder] native permission failed:', e?.message);
        return 'denied';
      }
    }

    if (!('Notification' in window)) {
      console.log('[VaccinationReminder] Browser notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Android 12+ (API 31+): ensure the app is allowed to schedule EXACT alarms.
   * Without this, scheduled notifications are batched/delayed and may not fire
   * at the exact reminder time. If not granted, open the system settings page.
   */
  async ensureExactAlarmPermission() {
    if (!this.isNative) return true;
    try {
      // Method available in @capacitor/local-notifications v5+
      if (typeof LocalNotifications.checkExactNotificationSetting === 'function') {
        const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
        console.log('[VaccinationReminder] exact_alarm setting:', exact_alarm);
        if (exact_alarm !== 'granted') {
          // Opens the "Alarms & reminders" system settings for this app
          if (typeof LocalNotifications.changeExactNotificationSetting === 'function') {
            await LocalNotifications.changeExactNotificationSetting();
          }
          return false;
        }
        return true;
      }
    } catch (e) {
      console.warn('[VaccinationReminder] exact alarm check failed:', e?.message);
    }
    return true;
  }

  /**
   * Parse a date-only string (YYYY-MM-DD) into a LOCAL Date at midnight,
   * avoiding the UTC-shift bug from `new Date("YYYY-MM-DD")`.
   */
  parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const datePart = String(dateStr).slice(0, 10);
    const [y, mo, d] = datePart.split('-').map((x) => parseInt(x, 10));
    if (!y || !mo || !d) return new Date(dateStr);
    return new Date(y, mo - 1, d);
  }

  /**
   * Start periodic vaccination checks
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.syncScheduledNotifications();
    }, this.CHECK_INTERVAL_MS);

    console.log('[VaccinationReminder] Periodic re-sync started (every hour)');
  }

  /**
   * Build a notification ID that is stable per vaccination + reminder day.
   * Keeps IDs within 32-bit int range for the native plugin.
   */
  buildNotifId(vaccinationId, daysUntil) {
    const base = Number(vaccinationId) || 0;
    return ((base * 10) + daysUntil) % 2147483000;
  }

  /**
   * Fetch vaccinations and SCHEDULE native local notifications in advance.
   * These fire even when the app is closed because the OS owns the schedule.
   */
  async syncScheduledNotifications() {
    try {
      const vaccinations = await userApi.get('/user/vaccinations');
      if (!Array.isArray(vaccinations)) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = vaccinations.filter((v) => {
        if (v.status === 'completed' || !v.next_due) return false;
        const due = this.parseLocalDate(v.next_due);
        if (!due) return false;
        due.setHours(0, 0, 0, 0);
        return due >= today;
      });

      if (this.isNative) {
        await this.scheduleNativeNotifications(upcoming);
      } else {
        // Browser fallback: only fire if app is open at the right hour
        await this.checkVaccinations();
      }
    } catch (error) {
      console.error('[VaccinationReminder] Error syncing notifications:', error);
    }
  }

  /**
   * Track which vaccination records the user has already been notified about,
   * so we can fire a "New vaccination scheduled" banner the first time a record
   * added by the admin shows up (the moment the app syncs/foregrounds).
   */
  getKnownVaxIds() {
    try { return new Set(JSON.parse(localStorage.getItem('bh_known_vax_ids') || '[]')); }
    catch { return new Set(); }
  }

  saveKnownVaxIds(set) {
    try { localStorage.setItem('bh_known_vax_ids', JSON.stringify([...set])); }
    catch { /* ignore quota errors */ }
  }

  hasKnownVaxInit() {
    return localStorage.getItem('bh_known_vax_ids') !== null;
  }

  /**
   * Schedule native notifications for all upcoming reminders.
   */
  async scheduleNativeNotifications(upcoming) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Clear previously scheduled vaccination notifications to avoid duplicates
    try {
      const pending = await LocalNotifications.getPending();
      if (pending?.notifications?.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (e) {
      console.warn('[VaccinationReminder] could not clear pending:', e?.message);
    }

    const toSchedule = [];

    let immediateOffset = 0; // stagger immediate notifications a few seconds apart

    for (const vax of upcoming) {
      const reminderTime = vax.reminder_time || '09:00';
      const [h, m] = reminderTime.split(':').map((x) => parseInt(x, 10));

      const due = this.parseLocalDate(vax.next_due);
      if (!due) continue;

      const dueStr = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());

      // NOTE: The "new vaccine added" banner is handled exclusively by the
      // remote FCM push (see supabaseApi.js -> send-push). We intentionally do
      // NOT fire a local "New Vaccination" banner here to avoid a duplicate and
      // to keep the add-notification distinct from the scheduled reminders below.

      // If the vaccine is OVERDUE (due date before today) or DUE TODAY but the
      // reminder time already passed, fire an immediate banner so the user sees it.
      const isOverdue = dueMidnight.getTime() < today.getTime();
      const dueTodayFire = new Date(today); dueTodayFire.setHours(h || 9, m || 0, 0, 0);
      const dueTodayPassed = dueMidnight.getTime() === today.getTime() && dueTodayFire.getTime() <= now.getTime();

      if (isOverdue || dueTodayPassed) {
        immediateOffset += 5;
        toSchedule.push({
          id: this.buildNotifId(vax.id, 9), // 9 = immediate/overdue slot
          channelId: 'vaccination-reminders',
          title: isOverdue ? '⚠️ Vaccination Overdue!' : '🩺 Vaccination Due Today!',
          body: `${vax.vaccine} (${vax.dose}) — ${isOverdue ? 'was due' : 'due'} ${dueStr}. Please visit the health center.`,
          schedule: { at: new Date(now.getTime() + immediateOffset * 1000), allowWhileIdle: true },
          smallIcon: 'ic_stat_icon',
          extra: { vaccination_id: vax.id, route: '/user/vaccinations' },
        });
        continue; // no future day-based reminders needed for overdue items
      }

      for (const daysBefore of this.REMINDER_DAYS) {
        const fireDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        fireDate.setDate(fireDate.getDate() - daysBefore);
        fireDate.setHours(h || 9, m || 0, 0, 0);

        // Only schedule if the fire time is still in the future
        if (fireDate.getTime() <= now.getTime()) continue;

        let title;
        if (daysBefore === 0) title = `🩺 Vaccination Due Today!`;
        else if (daysBefore === 1) title = `🩺 Vaccination Tomorrow`;
        else title = `🩺 Vaccination in ${daysBefore} days`;

        toSchedule.push({
          id: this.buildNotifId(vax.id, daysBefore),
          channelId: 'vaccination-reminders',
          title,
          body: `${vax.vaccine} (${vax.dose}) - scheduled for ${dueStr}. Please visit the health center.`,
          schedule: { at: fireDate, allowWhileIdle: true },
          smallIcon: 'ic_stat_icon',
          extra: { vaccination_id: vax.id, days_until: daysBefore, route: '/user/vaccinations' },
        });
      }
    }

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
      console.log(`[VaccinationReminder] Scheduled ${toSchedule.length} native notifications (fire even when app closed)`);
    } else {
      console.log('[VaccinationReminder] No future reminders to schedule');
    }

    // Remember the full set of current upcoming records so newly-added ones
    // (by the admin) are detected and announced on the next sync.
    this.saveKnownVaxIds(new Set(upcoming.map((v) => String(v.id))));
  }

  /**
   * Stop periodic checks
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[VaccinationReminder] Service stopped');
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * Explicitly (re)request notification permission. Returns 'granted' | 'denied'.
   * Use this when the user taps an "Enable" button.
   */
  async ensurePermission() {
    this.notificationPermission = await this.requestNotificationPermission();
    // Also ensure exact-alarm permission on Android 12+ so reminders fire on time
    if (this.isNative && this.notificationPermission === 'granted') {
      await this.ensureExactAlarmPermission();
    }
    return this.notificationPermission;
  }

  /**
   * Fire a TEST notification a few seconds from now so the user can verify
   * that reminders work even when the app is in the background / closed.
   * Returns an object describing what happened.
   */
  async sendTestNotification(secondsFromNow = 10) {
    // Make sure we have permission first
    const perm = await this.ensurePermission();
    if (perm !== 'granted') {
      return { ok: false, reason: 'permission-denied' };
    }

    if (this.isNative) {
      const fireDate = new Date(Date.now() + secondsFromNow * 1000);
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 999999,
              channelId: 'vaccination-reminders',
              title: '🩺 Test Vaccination Reminder',
              body: `This is a test. Real reminders will appear like this even when the app is closed.`,
              schedule: { at: fireDate, allowWhileIdle: true },
              smallIcon: 'ic_stat_icon',
              extra: { route: '/user/vaccinations' },
            },
          ],
        });
        return { ok: true, native: true, fireDate, secondsFromNow };
      } catch (e) {
        console.error('[VaccinationReminder] test schedule failed:', e);
        return { ok: false, reason: e?.message || 'schedule-failed' };
      }
    }

    // Web fallback - fires immediately (app must stay open)
    this.showBrowserNotification(
      '🩺 Test Vaccination Reminder',
      'This is a test notification. On the mobile app, reminders fire even when closed.',
      '/user/vaccinations'
    );
    return { ok: true, native: false };
  }

  /**
   * Returns current permission string without prompting.
   */
  getPermissionStatus() {
    if (this.isNative) return this.notificationPermission;
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Check for upcoming vaccinations and send reminders
   */
  async checkVaccinations() {
    try {
      console.log('[VaccinationReminder] Checking vaccinations...');
      
      // Fetch user's vaccinations
      const vaccinations = await userApi.get('/user/vaccinations');
      
      if (!Array.isArray(vaccinations)) {
        return;
      }

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Filter upcoming vaccinations
      const upcoming = vaccinations.filter(v => {
        if (v.status === 'completed' || !v.next_due) return false;
        
        const dueDate = this.parseLocalDate(v.next_due);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        
        return dueDate >= today;
      });

      // Check each upcoming vaccination
      for (const vax of upcoming) {
        const dueDate = this.parseLocalDate(vax.next_due);
        if (!dueDate) continue;
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        // Check if we should send a reminder
        if (this.REMINDER_DAYS.includes(daysUntilDue)) {
          // Check if it's time to send the reminder
          const reminderTime = vax.reminder_time || '09:00';
          const reminderHour = reminderTime.split(':')[0];
          const currentHour = String(now.getHours()).padStart(2, '0');
          
          // Send reminder if current hour matches reminder hour (within the same hour)
          if (currentHour === reminderHour) {
            await this.sendReminder(vax, daysUntilDue);
          }
        }
      }

      // Check for overdue vaccinations
      const overdue = vaccinations.filter(v => {
        if (v.status === 'completed' || !v.next_due) return false;
        
        const dueDate = this.parseLocalDate(v.next_due);
        if (!dueDate) return false;
        dueDate.setHours(0, 0, 0, 0);
        
        return dueDate < today;
      });

      if (overdue.length > 0) {
        await this.sendOverdueReminder(overdue);
      }

    } catch (error) {
      console.error('[VaccinationReminder] Error checking vaccinations:', error);
    }
  }

  /**
   * Send reminder for a specific vaccination
   */
  async sendReminder(vaccination, daysUntil) {
    const { vaccine, dose, next_due } = vaccination;
    
    let message = '';
    if (daysUntil === 0) {
      message = `🩺 Vaccination Due Today! ${vaccine} - ${dose}`;
    } else if (daysUntil === 1) {
      message = `🩺 Vaccination Tomorrow: ${vaccine} - ${dose}`;
    } else {
      message = `🩺 Vaccination in ${daysUntil} days: ${vaccine} - ${dose}`;
    }

    const dueDate = this.parseLocalDate(next_due).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Send browser notification
    this.showBrowserNotification(
      message,
      `Scheduled for ${dueDate}. Don't forget to visit the health center!`,
      '/user/vaccinations'
    );

    // Send in-app notification
    await this.createInAppNotification({
      type: 'vaccination_reminder',
      title: message,
      message: `Your ${vaccine} (${dose}) is scheduled for ${dueDate}. Please visit the health center.`,
      priority: daysUntil === 0 ? 'high' : 'normal',
      data: { vaccination_id: vaccination.id, days_until: daysUntil }
    });

    console.log(`[VaccinationReminder] Sent reminder for ${vaccine} - ${dose} (${daysUntil} days)`);
  }

  /**
   * Send overdue vaccination reminder
   */
  async sendOverdueReminder(overdueVaccinations) {
    const count = overdueVaccinations.length;
    const message = `⚠️ ${count} Overdue Vaccination${count > 1 ? 's' : ''}`;
    
    const vaccines = overdueVaccinations.map(v => `${v.vaccine} - ${v.dose}`).join(', ');
    
    // Send browser notification
    this.showBrowserNotification(
      message,
      `Please schedule: ${vaccines}`,
      '/user/vaccinations'
    );

    // Send in-app notification
    await this.createInAppNotification({
      type: 'vaccination_overdue',
      title: message,
      message: `You have overdue vaccinations: ${vaccines}. Please contact the health center.`,
      priority: 'high',
      data: { overdue_count: count }
    });

    console.log(`[VaccinationReminder] Sent overdue reminder for ${count} vaccination(s)`);
  }

  /**
   * Show browser notification
   */
  showBrowserNotification(title, body, url = null) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'vaccination-reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200],
      });

      if (url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = url;
          notification.close();
        };
      }

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('[VaccinationReminder] Error showing browser notification:', error);
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(data) {
    try {
      // Create notification in the database
      await userApi.post('/user/notifications', {
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'normal',
        data: JSON.stringify(data.data || {})
      });
    } catch (error) {
      console.error('[VaccinationReminder] Error creating in-app notification:', error);
    }
  }

  /**
   * Check if a reminder was already sent today
   */
  wasReminderSentToday(vaccinationId) {
    const key = `vax_reminder_${vaccinationId}`;
    const lastSent = localStorage.getItem(key);
    
    if (!lastSent) return false;
    
    const today = new Date().toDateString();
    return lastSent === today;
  }

  /**
   * Mark reminder as sent
   */
  markReminderSent(vaccinationId) {
    const key = `vax_reminder_${vaccinationId}`;
    const today = new Date().toDateString();
    localStorage.setItem(key, today);
  }
}

// Create singleton instance
const vaccinationReminderService = new VaccinationReminderService();

export default vaccinationReminderService;
