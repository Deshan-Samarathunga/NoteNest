import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models.dart';
import '../../core/sync_service.dart';
import '../../local/local_database.dart';
import '../notes/app_scaffold.dart';
import '../notes/notes_controller.dart';

class LabelsScreen extends ConsumerStatefulWidget {
  const LabelsScreen({super.key});

  @override
  ConsumerState<LabelsScreen> createState() => _LabelsScreenState();
}

class _LabelsScreenState extends ConsumerState<LabelsScreen> {
  final newLabelController = TextEditingController();
  final edits = <String, TextEditingController>{};
  bool saving = false;

  @override
  void dispose() {
    newLabelController.dispose();
    for (final controller in edits.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final labels = ref.watch(notesControllerProvider).labels;
    for (final label in labels) {
      edits.putIfAbsent(label.id, () => TextEditingController(text: label.name));
    }

    return NoteNestScaffold(
      title: 'Labels',
      selectedPath: '/labels',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(child: TextField(controller: newLabelController, decoration: const InputDecoration(labelText: 'New label'))),
              const SizedBox(width: 8),
              FilledButton.icon(onPressed: saving ? null : _create, icon: const Icon(Icons.add), label: const Text('Add')),
            ],
          ),
          const SizedBox(height: 16),
          if (labels.isEmpty) const Text('No labels yet.'),
          ...labels.map(
            (label) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(child: TextField(controller: edits[label.id], decoration: const InputDecoration(labelText: 'Label'))),
                  IconButton(icon: const Icon(Icons.save_outlined), onPressed: saving ? null : () => _rename(label)),
                  IconButton(icon: const Icon(Icons.delete_outline), onPressed: saving ? null : () => _delete(label)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _create() async {
    final name = newLabelController.text.trim();
    if (name.isEmpty) return;
    setState(() => saving = true);
    try {
      final label = await ref.read(syncServiceProvider).api.createLabel(name);
      final labels = [...ref.read(notesControllerProvider).labels, label];
      await LocalDatabase.instance.replaceLabels(labels);
      await ref.read(notesControllerProvider.notifier).load();
      newLabelController.clear();
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> _rename(LabelModel label) async {
    final name = edits[label.id]?.text.trim() ?? '';
    if (name.isEmpty) return;
    setState(() => saving = true);
    try {
      final updated = await ref.read(syncServiceProvider).api.updateLabel(label.id, name);
      final labels = ref.read(notesControllerProvider).labels.map((item) => item.id == label.id ? updated : item).toList();
      await LocalDatabase.instance.replaceLabels(labels);
      await ref.read(notesControllerProvider.notifier).load();
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> _delete(LabelModel label) async {
    setState(() => saving = true);
    try {
      await ref.read(syncServiceProvider).api.deleteLabel(label.id);
      final labels = ref.read(notesControllerProvider).labels.where((item) => item.id != label.id).toList();
      await LocalDatabase.instance.replaceLabels(labels);
      final notes = (await LocalDatabase.instance.getAllNotes())
          .map((note) => note.copyWith(labels: note.labels.where((id) => id != label.id).toList()))
          .toList();
      await LocalDatabase.instance.replaceNotes(notes);
      await ref.read(notesControllerProvider.notifier).load();
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }
}
