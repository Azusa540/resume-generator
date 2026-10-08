const SW_URL = '/notification-sw.js';

export async function enableResumeNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  void notificationRegistration();
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export function notificationBlockedMessage(permission: NotificationPermission | 'unsupported'): string {
  if (permission === 'granted') return '';
  if (permission === 'unsupported') return 'This browser cannot show desktop notifications.';
  return 'Chrome did not allow notifications. Click the lock icon in the address bar, set Notifications to Allow, then generate again.';
}

export async function notifyResumeReady(company: string, jobTitle: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const body = [company, jobTitle].filter(Boolean).join(' · ') || 'A resume finished generating.';
  const title = 'Resume ready';
  try {
    const registration = await notificationRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag: `resume-${Date.now()}`,
      });
      return;
    }
  } catch {
    /* fall through to the page notification */
  }

  const notification = new Notification(title, { body });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

async function notificationRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    await navigator.serviceWorker.register(SW_URL);
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}
