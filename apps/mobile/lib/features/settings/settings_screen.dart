import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/settings_controller.dart';
import '../../local/local_database.dart';
import '../notes/app_scaffold.dart';
import '../notes/notes_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController apiUrlController;
  final passphraseController = TextEditingController();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  bool authLoading = false;

  @override
  void initState() {
    super.initState();
    apiUrlController = TextEditingController(text: ref.read(settingsProvider).apiBaseUrl);
  }

  @override
  void dispose() {
    apiUrlController.dispose();
    passphraseController.dispose();
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final controller = ref.read(settingsProvider.notifier);
    return NoteNestScaffold(
      title: 'Settings',
      selectedPath: '/settings',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<String>(
            initialValue: settings.theme,
            decoration: const InputDecoration(labelText: 'Theme'),
            items: const [
              DropdownMenuItem(value: 'system', child: Text('System')),
              DropdownMenuItem(value: 'light', child: Text('Light')),
              DropdownMenuItem(value: 'dark', child: Text('Dark')),
            ],
            onChanged: (value) => controller.setTheme(value ?? 'system'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: settings.defaultLayout,
            decoration: const InputDecoration(labelText: 'Default layout'),
            items: const [
              DropdownMenuItem(value: 'grid', child: Text('Grid')),
              DropdownMenuItem(value: 'list', child: Text('List')),
            ],
            onChanged: (value) => controller.setDefaultLayout(value ?? 'grid'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            initialValue: settings.purgeDays,
            decoration: const InputDecoration(labelText: 'Purge trash after'),
            items: const [
              DropdownMenuItem(value: 7, child: Text('7 days')),
              DropdownMenuItem(value: 14, child: Text('14 days')),
              DropdownMenuItem(value: 30, child: Text('30 days')),
            ],
            onChanged: (value) => controller.setPurgeDays(value ?? 7),
          ),
          const SizedBox(height: 12),
          TextField(controller: apiUrlController, decoration: const InputDecoration(labelText: 'API base URL'), keyboardType: TextInputType.url),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilledButton(onPressed: () => controller.setApiBaseUrl(apiUrlController.text), child: const Text('Save URL')),
              OutlinedButton(
                onPressed: () {
                  final url = SettingsController.defaultApiBaseUrl();
                  apiUrlController.text = url;
                  controller.setApiBaseUrl(url);
                },
                child: const Text('Reset'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          TextField(controller: passphraseController, decoration: const InputDecoration(labelText: 'Session passphrase'), obscureText: true),
          const SizedBox(height: 8),
          FilledButton(onPressed: () => controller.setSessionPassphrase(passphraseController.text), child: const Text('Save passphrase')),
          const Divider(height: 36),
          TextField(controller: usernameController, decoration: const InputDecoration(labelText: 'Username')),
          const SizedBox(height: 12),
          TextField(controller: passwordController, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilledButton.icon(
                onPressed: authLoading ? null : _login,
                icon: const Icon(Icons.login),
                label: Text(authLoading ? 'Logging in' : 'Login'),
              ),
              OutlinedButton.icon(
                onPressed: () => controller.setSessionToken(null),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(settings.sessionToken == null ? 'Not logged in.' : 'Token saved.'),
          ),
          const Divider(height: 36),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(onPressed: () => ref.read(notesControllerProvider.notifier).sync(), icon: const Icon(Icons.sync), label: const Text('Sync now')),
              OutlinedButton.icon(onPressed: _clearCache, icon: const Icon(Icons.delete_sweep_outlined), label: const Text('Clear cache')),
              OutlinedButton.icon(onPressed: () => ref.read(notesControllerProvider.notifier).purgeOldTrash(settings.purgeDays), icon: const Icon(Icons.auto_delete_outlined), label: const Text('Purge trash')),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _login() async {
    setState(() => authLoading = true);
    try {
      final token = await ref.read(apiClientProvider).login(usernameController.text.trim(), passwordController.text);
      await ref.read(settingsProvider.notifier).setSessionToken(token);
      passwordController.clear();
      await ref.read(notesControllerProvider.notifier).sync();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login failed: $error')));
      }
    } finally {
      if (mounted) setState(() => authLoading = false);
    }
  }

  Future<void> _clearCache() async {
    await LocalDatabase.instance.clearAll();
    await ref.read(notesControllerProvider.notifier).load();
  }
}
