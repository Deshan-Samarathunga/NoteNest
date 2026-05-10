import 'package:go_router/go_router.dart';

import '../core/models.dart';
import '../features/labels/labels_screen.dart';
import '../features/notes/note_editor_screen.dart';
import '../features/notes/notes_screen.dart';
import '../features/settings/settings_screen.dart';

final appRouter = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const NotesScreen(view: NotesView.active),
      routes: [
        GoRoute(
          path: 'new',
          builder: (context, state) => const NoteEditorScreen(),
        ),
        GoRoute(
          path: 'note',
          builder: (context, state) => NoteEditorScreen(note: state.extra as NotePayload?),
        ),
      ],
    ),
    GoRoute(
      path: '/archive',
      builder: (context, state) => const NotesScreen(view: NotesView.archive),
    ),
    GoRoute(
      path: '/trash',
      builder: (context, state) => const NotesScreen(view: NotesView.trash),
    ),
    GoRoute(
      path: '/labels',
      builder: (context, state) => const LabelsScreen(),
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
);
