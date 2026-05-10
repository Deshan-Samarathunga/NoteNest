import 'dart:convert';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';

import '../core/models.dart';

class MutationRecord {
  const MutationRecord({
    required this.id,
    required this.noteId,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String noteId;
  final NotePayload payload;
  final int createdAt;
}

class LocalDatabase {
  LocalDatabase._();

  static final instance = LocalDatabase._();
  static const _uuid = Uuid();

  Database? _db;

  Future<void> init() async {
    if (_db != null) return;
    final dir = await getApplicationDocumentsDirectory();
    _db = await openDatabase(
      p.join(dir.path, 'notenest.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE notes (
            id TEXT PRIMARY KEY,
            payload TEXT NOT NULL,
            updatedAt INTEGER NOT NULL,
            dirty INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE labels (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            updatedAt INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE pending_mutations (
            id TEXT PRIMARY KEY,
            noteId TEXT NOT NULL,
            payload TEXT NOT NULL,
            createdAt INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        ''');
      },
    );
  }

  Database get db {
    final database = _db;
    if (database == null) throw StateError('Database is not initialized');
    return database;
  }

  Future<List<NotePayload>> getAllNotes() async {
    final rows = await db.query('notes');
    return rows
        .map((row) => NotePayload.fromJson(jsonDecode(row['payload'] as String) as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveNote(NotePayload note, {bool dirty = true}) async {
    await db.insert(
      'notes',
      {
        'id': note.id,
        'payload': jsonEncode(note.toJson()),
        'updatedAt': note.updatedAt,
        'dirty': dirty ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    if (dirty) await addMutation(note);
  }

  Future<void> replaceNotes(List<NotePayload> notes) async {
    await db.transaction((txn) async {
      await txn.delete('notes');
      for (final note in notes) {
        await txn.insert(
          'notes',
          {
            'id': note.id,
            'payload': jsonEncode(note.toJson()),
            'updatedAt': note.updatedAt,
            'dirty': 0,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<void> replaceLabels(List<LabelModel> labels) async {
    await db.transaction((txn) async {
      await txn.delete('labels');
      for (final label in labels) {
        await txn.insert(
          'labels',
          label.toJson(),
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<List<LabelModel>> getLabels() async {
    final rows = await db.query('labels', orderBy: 'name COLLATE NOCASE');
    return rows.map((row) => LabelModel.fromJson(row)).toList();
  }

  Future<void> addMutation(NotePayload note) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await db.insert(
      'pending_mutations',
      {
        'id': _uuid.v4(),
        'noteId': note.id,
        'payload': jsonEncode(note.toJson()),
        'createdAt': now,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<MutationRecord>> listMutations() async {
    final rows = await db.query('pending_mutations', orderBy: 'createdAt ASC');
    return rows
        .map(
          (row) => MutationRecord(
            id: row['id'] as String,
            noteId: row['noteId'] as String,
            payload: NotePayload.fromJson(jsonDecode(row['payload'] as String) as Map<String, dynamic>),
            createdAt: row['createdAt'] as int,
          ),
        )
        .toList();
  }

  Future<void> clearMutations() async {
    await db.delete('pending_mutations');
  }

  Future<int> getLastSync() async {
    final rows = await db.query('metadata', where: 'key = ?', whereArgs: ['lastSync'], limit: 1);
    if (rows.isEmpty) return 0;
    return int.tryParse((rows.first['value'] as String?) ?? '') ?? 0;
  }

  Future<void> setLastSync(int value) async {
    await db.insert(
      'metadata',
      {'key': 'lastSync', 'value': value.toString()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> clearAll() async {
    await db.transaction((txn) async {
      await txn.delete('notes');
      await txn.delete('labels');
      await txn.delete('pending_mutations');
      await txn.delete('metadata');
    });
  }
}
