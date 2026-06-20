import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences override is required');
});

final settingsProvider = StateNotifierProvider<SettingsController, SettingsState>((ref) {
  return SettingsController(ref.watch(sharedPreferencesProvider));
});

class SettingsState {
  const SettingsState({
    required this.theme,
    required this.defaultLayout,
    required this.purgeDays,
    required this.apiBaseUrl,
    required this.sessionToken,
    required this.sessionPassphrase,
  });

  final String theme;
  final String defaultLayout;
  final int purgeDays;
  final String apiBaseUrl;
  final String? sessionToken;
  final String sessionPassphrase;

  SettingsState copyWith({
    String? theme,
    String? defaultLayout,
    int? purgeDays,
    String? apiBaseUrl,
    String? sessionToken,
    bool clearToken = false,
    String? sessionPassphrase,
  }) {
    return SettingsState(
      theme: theme ?? this.theme,
      defaultLayout: defaultLayout ?? this.defaultLayout,
      purgeDays: purgeDays ?? this.purgeDays,
      apiBaseUrl: apiBaseUrl ?? this.apiBaseUrl,
      sessionToken: clearToken ? null : sessionToken ?? this.sessionToken,
      sessionPassphrase: sessionPassphrase ?? this.sessionPassphrase,
    );
  }
}

class SettingsController extends StateNotifier<SettingsState> {
  SettingsController(this._prefs)
      : super(
          SettingsState(
            theme: _prefs.getString('theme') ?? 'system',
            defaultLayout: _prefs.getString('defaultLayout') ?? 'grid',
            purgeDays: _prefs.getInt('purgeDays') ?? 7,
            apiBaseUrl: _prefs.getString('apiBaseUrl') ?? defaultApiBaseUrl(),
            sessionToken: _prefs.getString('sessionToken'),
            sessionPassphrase: '',
          ),
        );

  final SharedPreferences _prefs;

  static String defaultApiBaseUrl() {
    return 'http://192.168.1.5:3000/api';
  }

  Future<void> setTheme(String value) async {
    state = state.copyWith(theme: value);
    await _prefs.setString('theme', value);
  }

  Future<void> setDefaultLayout(String value) async {
    state = state.copyWith(defaultLayout: value);
    await _prefs.setString('defaultLayout', value);
  }

  Future<void> setPurgeDays(int value) async {
    state = state.copyWith(purgeDays: value);
    await _prefs.setInt('purgeDays', value);
  }

  Future<void> setApiBaseUrl(String value) async {
    final normalized = value.trim().replaceAll(RegExp(r'/+$'), '');
    state = state.copyWith(apiBaseUrl: normalized);
    await _prefs.setString('apiBaseUrl', normalized);
  }

  Future<void> setSessionToken(String? token) async {
    state = state.copyWith(sessionToken: token, clearToken: token == null);
    if (token == null) {
      await _prefs.remove('sessionToken');
    } else {
      await _prefs.setString('sessionToken', token);
    }
  }

  void setSessionPassphrase(String value) {
    state = state.copyWith(sessionPassphrase: value);
  }
}
