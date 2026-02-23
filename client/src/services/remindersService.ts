import * as Notifications from 'expo-notifications';

type ReminderRequest = {
  noteId: string;
  reminderAt: number;
  title?: string | null;
  body?: string | null;
};

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  return request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleReminder(request: ReminderRequest): Promise<string | null> {
  const { noteId, reminderAt, title, body } = request;
  const triggerDate = new Date(reminderAt);
  if (Number.isNaN(triggerDate.getTime())) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'Reminder',
      body: body || 'Open note',
      data: { noteId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
  return id;
}

export async function cancelReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Failed to cancel notification', err);
  }
}
