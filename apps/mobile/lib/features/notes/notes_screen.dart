import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/settings_controller.dart';
import 'app_scaffold.dart';
import 'note_card.dart';
import 'notes_controller.dart';

enum NotesView { active, archive, trash }

class NotesScreen extends ConsumerStatefulWidget {
  const NotesScreen({super.key, required this.view});

  final NotesView view;

  @override
  ConsumerState<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends ConsumerState<NotesScreen> {
  String search = '';
  String? selectedLabel;
  int? selectedColor;
  bool pinnedOnly = false;
  String sortBy = 'updatedAt';

  static const colors = [0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7];

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notesControllerProvider);
    final controller = ref.read(notesControllerProvider.notifier);
    final settings = ref.watch(settingsProvider);
    final labelMap = {for (final label in state.labels) label.id: label};
    final notes = _filtered(state.notes);
    final pinned = notes.where((note) => note.pinned).toList();
    final others = notes.where((note) => !note.pinned).toList();

    return NoteNestScaffold(
      title: switch (widget.view) {
        NotesView.archive => 'Archive',
        NotesView.trash => 'Trash',
        NotesView.active => 'Notes',
      },
      selectedPath: switch (widget.view) {
        NotesView.archive => '/archive',
        NotesView.trash => '/trash',
        NotesView.active => '/',
      },
      actions: [
        IconButton(
          tooltip: state.status,
          icon: state.syncing ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.sync),
          onPressed: state.syncing ? null : controller.sync,
        ),
      ],
      floatingActionButton: widget.view == NotesView.active
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/new'),
              icon: const Icon(Icons.add),
              label: const Text('New'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: controller.sync,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
          children: [
            TextField(
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search notes'),
              onChanged: (value) => setState(() => search = value),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                FilterChip(
                  selected: selectedLabel == null && selectedColor == null && !pinnedOnly,
                  label: const Text('All'),
                  onSelected: (_) => setState(() {
                    selectedLabel = null;
                    selectedColor = null;
                    pinnedOnly = false;
                  }),
                ),
                FilterChip(
                  selected: pinnedOnly,
                  label: const Text('Pinned'),
                  onSelected: (value) => setState(() => pinnedOnly = value),
                ),
                ...state.labels.map(
                  (label) => FilterChip(
                    selected: selectedLabel == label.id,
                    label: Text(label.name),
                    onSelected: (_) => setState(() => selectedLabel = selectedLabel == label.id ? null : label.id),
                  ),
                ),
                ...colors.map(
                  (color) => ChoiceChip(
                    selected: selectedColor == color,
                    label: const SizedBox(width: 14, height: 14),
                    backgroundColor: Color(0xff000000 | color),
                    selectedColor: Color(0xff000000 | color),
                    onSelected: (_) => setState(() => selectedColor = selectedColor == color ? null : color),
                  ),
                ),
                DropdownButton<String>(
                  value: sortBy,
                  items: const [
                    DropdownMenuItem(value: 'updatedAt', child: Text('Updated')),
                    DropdownMenuItem(value: 'createdAt', child: Text('Created')),
                  ],
                  onChanged: (value) => setState(() => sortBy = value ?? 'updatedAt'),
                ),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'grid', icon: Icon(Icons.grid_view)),
                    ButtonSegment(value: 'list', icon: Icon(Icons.view_agenda)),
                  ],
                  selected: {settings.defaultLayout},
                  onSelectionChanged: (value) => ref.read(settingsProvider.notifier).setDefaultLayout(value.first),
                ),
              ],
            ),
            if (state.loading) const LinearProgressIndicator(),
            const SizedBox(height: 16),
            if (pinned.isNotEmpty) _SectionTitle('Pinned'),
            _NotesLayout(notes: pinned, labelMap: labelMap, layout: settings.defaultLayout, inTrash: widget.view == NotesView.trash),
            if (pinned.isNotEmpty && others.isNotEmpty) const SizedBox(height: 16),
            if (pinned.isNotEmpty && others.isNotEmpty) _SectionTitle('Others'),
            _NotesLayout(notes: others, labelMap: labelMap, layout: settings.defaultLayout, inTrash: widget.view == NotesView.trash),
            if (!state.loading && notes.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 80),
                child: Center(
                  child: Column(
                    children: [
                      const Text('No notes here'),
                      const SizedBox(height: 12),
                      if (widget.view == NotesView.active) FilledButton.icon(onPressed: () => context.push('/new'), icon: const Icon(Icons.add), label: const Text('New note')),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<NotePayload> _filtered(List<NotePayload> all) {
    final term = search.trim().toLowerCase();
    return all.where((note) {
      if (widget.view == NotesView.archive) {
        if (!note.archived || note.trashed || note.deleted) return false;
      } else if (widget.view == NotesView.trash) {
        if (!note.trashed || note.deleted) return false;
      } else if (note.archived || note.trashed || note.deleted) {
        return false;
      }
      if (selectedLabel != null && !note.labels.contains(selectedLabel)) return false;
      if (selectedColor != null && note.color != selectedColor) return false;
      if (pinnedOnly && !note.pinned) return false;
      if (term.isEmpty) return true;
      final checklistText = note.checklist.map((item) => item.text).join(' ');
      return '${note.title ?? ''} ${note.body ?? ''} $checklistText'.toLowerCase().contains(term);
    }).toList()
      ..sort((a, b) {
        final av = sortBy == 'createdAt' ? a.createdAt ?? 0 : a.updatedAt;
        final bv = sortBy == 'createdAt' ? b.createdAt ?? 0 : b.updatedAt;
        return bv.compareTo(av);
      });
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelMedium),
    );
  }
}

class _NotesLayout extends ConsumerWidget {
  const _NotesLayout({
    required this.notes,
    required this.labelMap,
    required this.layout,
    required this.inTrash,
  });

  final List<NotePayload> notes;
  final Map<String, LabelModel> labelMap;
  final String layout;
  final bool inTrash;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(notesControllerProvider.notifier);
    final cards = notes.map((note) {
      return NoteCard(
        note: note,
        labels: note.labels.map((id) => labelMap[id]).whereType<LabelModel>().toList(),
        inTrash: inTrash,
        onTap: () => context.push('/note', extra: note),
        onPin: () => controller.save(note.copyWith(pinned: !note.pinned)),
        onArchive: () => controller.save(note.copyWith(archived: !note.archived)),
        onTrash: () => controller.trash(note),
        onRestore: () => controller.restore(note),
        onDeleteForever: () => controller.deleteForever(note),
      );
    }).toList();

    if (layout == 'list') {
      return Column(children: cards.map((card) => Padding(padding: const EdgeInsets.only(bottom: 10), child: card)).toList());
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth > 700 ? (constraints.maxWidth - 12) / 2 : constraints.maxWidth;
        return Wrap(spacing: 12, runSpacing: 12, children: cards.map((card) => SizedBox(width: width, child: card)).toList());
      },
    );
  }
}
