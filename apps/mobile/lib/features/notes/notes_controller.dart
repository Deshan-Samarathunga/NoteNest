import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../core/models.dart';
import '../../core/sync_service.dart';
import '../../features/reminders/reminders_service.dart';
import '../../local/local_database.dart';

final notesControllerProvider = StateNotifierProvider<NotesController, NotesState>((ref) {
  return NotesController(ref);
});

class NotesState {
  const NotesState({
    this.notes = const [],
    this.labels = const [],
    this.loading = true,
    this.syncing = false,
    this.status = 'Loading',
  });

  final List<NotePayload> notes;
  final List<LabelModel> labels;
  final bool loading;
  final bool syncing;
  final String status;

  NotesState copyWith({
    List<NotePayload>? notes,
    List<LabelModel>? labels,
    bool? loading,
    bool? syncing,
    String? status,
  }) {
    return NotesState(
      notes: notes ?? this.notes,
      labels: labels ?? this.labels,
      loading: loading ?? this.loading,
      syncing: syncing ?? this.syncing,
      status: status ?? this.status,
    );
  }
}

class NotesController extends StateNotifier<NotesState> {
  NotesController(this.ref) : super(const NotesState()) {
    load();
  }

  final Ref ref;
  static const _uuid = Uuid();

  LocalDatabase get _db => LocalDatabase.instance;

  Future<void> load() async {
    state = state.copyWith(loading: true);
    final notes = await _db.getAllNotes();
    final labels = await _db.getLabels();
    state = state.copyWith(notes: notes, labels: labels, loading: false, status: 'Offline cache ready');
  }

  Future<void> sync() async {
    state = state.copyWith(syncing: true);
    try {
      await ref.read(syncServiceProvider).runSync();
      final notes = await _db.getAllNotes();
      final labels = await _db.getLabels();
      state = state.copyWith(
        notes: notes,
        labels: labels,
        syncing: false,
        status: 'Synced ${DateTime.now().toLocal().toIso8601String().substring(11, 19)}',
      );
    } catch (error) {
      state = state.copyWith(syncing: false, status: error.toString());
    }
  }

  Future<void> save(NotePayload note) async {
    final updated = note.copyWith(updatedAt: DateTime.now().millisecondsSinceEpoch);
    await _db.saveNote(updated);
    await RemindersService.instance.scheduleForNote(updated);
    await load();
    await sync();
  }

  Future<void> patch(NotePayload note, NotePayload updated) async {
    await save(updated.copyWith(updatedAt: DateTime.now().millisecondsSinceEpoch));
  }

  Future<void> trash(NotePayload note) async {
    await save(note.copyWith(trashed: true, archived: false));
  }

  Future<void> restore(NotePayload note) async {
    await save(note.copyWith(trashed: false, deleted: false));
  }

  Future<void> deleteForever(NotePayload note) async {
    final deleted = note.copyWith(trashed: true, deleted: true, updatedAt: DateTime.now().millisecondsSinceEpoch);
    await _db.saveNote(deleted);
    await _db.replaceNotes((await _db.getAllNotes()).where((item) => item.id != note.id).toList());
    await load();
    await sync();
  }

  Future<void> purgeOldTrash(int purgeDays) async {
    final cutoff = DateTime.now().subtract(Duration(days: purgeDays)).millisecondsSinceEpoch;
    final stale = state.notes.where((note) => note.trashed && !note.deleted && note.updatedAt < cutoff).toList();
    for (final note in stale) {
      await deleteForever(note);
    }
  }

  NotePayload newNote() {
    final now = DateTime.now().millisecondsSinceEpoch;
    return NotePayload(
      id: _uuid.v4(),
      createdAt: now,
      updatedAt: now,
    );
  }
}
