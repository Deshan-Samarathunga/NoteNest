import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../../core/models.dart';

class RemindersService {
  RemindersService._();

  static final instance = RemindersService._();
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    tzdata.initializeTimeZones();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin.initialize(const InitializationSettings(android: android, iOS: ios));
    _initialized = true;
  }

  Future<bool> requestPermissions() async {
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.requestNotificationsPermission();
    final ios = _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    final iosGranted = await ios?.requestPermissions(alert: true, badge: true, sound: true);
    return iosGranted ?? true;
  }

  Future<String?> scheduleForNote(NotePayload note) async {
    if (note.reminderAt == null || note.reminderAt! <= DateTime.now().millisecondsSinceEpoch || note.trashed) {
      if (note.notificationId != null) await cancel(note.notificationId);
      return null;
    }
    await requestPermissions();
    final id = note.id.hashCode & 0x7fffffff;
    await _plugin.zonedSchedule(
      id,
      note.title?.isNotEmpty == true ? note.title : 'Reminder',
      note.body?.isNotEmpty == true ? note.body : 'Open your note',
      tz.TZDateTime.from(DateTime.fromMillisecondsSinceEpoch(note.reminderAt!), tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails('notenest_reminders', 'NoteNest reminders'),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      payload: note.id,
    );
    return id.toString();
  }

  Future<void> cancel(String? notificationId) async {
    final id = int.tryParse(notificationId ?? '');
    if (id != null) await _plugin.cancel(id);
  }
}
