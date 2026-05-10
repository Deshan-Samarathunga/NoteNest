import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/reminders/reminders_service.dart';
import '../local/local_database.dart';
import 'api_client.dart';
import 'models.dart';

final syncServiceProvider = Provider<SyncService>((ref) {
  return SyncService(ref.watch(apiClientProvider), LocalDatabase.instance);
});

class SyncService {
  SyncService(this.api, this.database);

  final ApiClient api;
  final LocalDatabase database;

  Future<void> runSync() async {
    if (api.settings.sessionToken == null) return;
    final pending = await database.listMutations();
    if (pending.isNotEmpty) {
      await api.push(pending.map((mutation) => mutation.payload).toList());
      await database.clearMutations();
    }

    final pulled = await api.pull(await database.getLastSync());
    final local = await database.getAllNotes();
    final merged = mergeServerNotes(pulled.notes, local);
    await database.replaceNotes(merged);
    await database.replaceLabels(pulled.labels);
    await database.setLastSync(pulled.serverTime);

    for (final note in merged) {
      await RemindersService.instance.scheduleForNote(note);
    }
  }

  List<NotePayload> mergeServerNotes(List<NotePayload> serverNotes, List<NotePayload> localNotes) {
    final map = {for (final note in localNotes) note.id: note};
    for (final remote in serverNotes) {
      final current = map[remote.id];
      if (remote.deleted) {
        map.remove(remote.id);
        continue;
      }
      if (current == null || remote.updatedAt >= current.updatedAt) {
        map[remote.id] = remote;
      }
    }
    return map.values.toList();
  }
}
