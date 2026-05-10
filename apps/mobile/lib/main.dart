import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/notenest_app.dart';
import 'core/settings_controller.dart';
import 'features/reminders/reminders_service.dart';
import 'local/local_database.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  await LocalDatabase.instance.init();
  await RemindersService.instance.init();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const NoteNestApp(),
    ),
  );
}
