import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import 'package:url_launcher/url_launcher_string.dart';

import '../../core/models.dart';
import '../attachments/attachments_service.dart';
import 'notes_controller.dart';

class NoteEditorScreen extends ConsumerStatefulWidget {
  const NoteEditorScreen({super.key, this.note});

  final NotePayload? note;

  @override
  ConsumerState<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends ConsumerState<NoteEditorScreen> {
  static const _uuid = Uuid();
  static const colors = [0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7];
  final titleController = TextEditingController();
  final bodyController = TextEditingController();
  final reminderController = TextEditingController();
  late NotePayload draft;
  bool saving = false;
  bool uploading = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now().millisecondsSinceEpoch;
    draft = widget.note ?? NotePayload(id: _uuid.v4(), createdAt: now, updatedAt: now);
    titleController.text = draft.title ?? '';
    bodyController.text = draft.body ?? '';
    if (draft.reminderAt != null) {
      reminderController.text = DateFormat('yyyy-MM-dd HH:mm').format(DateTime.fromMillisecondsSinceEpoch(draft.reminderAt!));
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
  }

  @override
  void dispose() {
    titleController.dispose();
    bodyController.dispose();
    reminderController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final labels = ref.watch(notesControllerProvider).labels;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.note == null ? 'New note' : 'Edit note'),
        actions: [
          IconButton(icon: const Icon(Icons.save_outlined), onPressed: saving ? null : _save),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<NoteType>(
            segments: const [
              ButtonSegment(value: NoteType.text, icon: Icon(Icons.notes), label: Text('Text')),
              ButtonSegment(value: NoteType.checklist, icon: Icon(Icons.checklist), label: Text('Checklist')),
            ],
            selected: {draft.type},
            onSelectionChanged: (value) {
              setState(() {
                final type = value.first;
                draft = _copyDraft(type: type);
                if (type == NoteType.checklist && draft.checklist.isEmpty) {
                  draft = _copyDraft(
                    checklist: [ChecklistItem(id: _uuid.v4(), text: bodyController.text, checked: false, sortOrder: 0)],
                  );
                }
                if (type == NoteType.text && draft.checklist.isNotEmpty && bodyController.text.isEmpty) {
                  bodyController.text = draft.checklist.map((item) => item.text).join('\n');
                }
              });
            },
          ),
          const SizedBox(height: 12),
          TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Title')),
          const SizedBox(height: 12),
          if (draft.type == NoteType.checklist) _ChecklistEditor(items: draft.checklist, onChanged: (items) => setState(() => draft = _copyDraft(checklist: items))) else TextField(controller: bodyController, minLines: 6, maxLines: 14, decoration: const InputDecoration(labelText: 'Body')),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilterChip(selected: draft.pinned, label: const Text('Pinned'), onSelected: (value) => setState(() => draft = _copyDraft(pinned: value))),
              FilterChip(selected: draft.archived, label: const Text('Archived'), onSelected: (value) => setState(() => draft = _copyDraft(archived: value))),
              FilterChip(selected: draft.trashed, label: const Text('Trashed'), onSelected: (value) => setState(() => draft = _copyDraft(trashed: value))),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: colors
                .map(
                  (color) => ChoiceChip(
                    selected: draft.color == color,
                    label: const SizedBox(width: 18, height: 18),
                    backgroundColor: Color(0xff000000 | color),
                    selectedColor: Color(0xff000000 | color),
                    onSelected: (_) => setState(() => draft = _copyDraft(color: color)),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: reminderController,
            decoration: const InputDecoration(labelText: 'Reminder', hintText: 'YYYY-MM-DD HH:mm'),
          ),
          const SizedBox(height: 12),
          Text('Labels', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: labels
                .map(
                  (label) => FilterChip(
                    selected: draft.labels.contains(label.id),
                    label: Text(label.name),
                    onSelected: (_) {
                      final next = draft.labels.contains(label.id)
                          ? draft.labels.where((id) => id != label.id).toList()
                          : [...draft.labels, label.id];
                      setState(() => draft = _copyDraft(labels: next));
                    },
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              FilledButton.icon(
                onPressed: uploading ? null : _uploadAttachment,
                icon: const Icon(Icons.attach_file),
                label: Text(uploading ? 'Uploading' : 'Add file'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...draft.attachments.map(
            (attachment) {
              final mime = attachment.mimeType?.toLowerCase() ?? '';
              IconData icon = Icons.insert_drive_file_outlined;
              if (mime.startsWith('image/')) icon = Icons.image_outlined;
              else if (mime.startsWith('video/')) icon = Icons.play_circle_outline;
              else if (mime.startsWith('audio/')) icon = Icons.music_note_outlined;
              
              return ListTile(
                leading: Icon(icon),
                title: Text(attachment.fileName ?? attachment.mimeType ?? 'Attachment'),
                subtitle: Text(attachment.uri, maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () => launchUrlString(attachment.uri, mode: LaunchMode.externalApplication),
                trailing: IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => draft = _copyDraft(attachments: draft.attachments.where((item) => item.id != attachment.id).toList())),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          FilledButton.icon(onPressed: saving ? null : _save, icon: const Icon(Icons.save_outlined), label: const Text('Save')),
        ],
      ),
    );
  }

  NotePayload _copyDraft({
    NoteType? type,
    List<ChecklistItem>? checklist,
    List<String>? labels,
    int? color,
    bool? pinned,
    bool? archived,
    bool? trashed,
    List<AttachmentMeta>? attachments,
  }) {
    return NotePayload(
      id: draft.id,
      title: titleController.text.trim().isEmpty ? null : titleController.text.trim(),
      body: bodyController.text.trim().isEmpty ? null : bodyController.text.trim(),
      type: type ?? draft.type,
      checklist: checklist ?? draft.checklist,
      labels: labels ?? draft.labels,
      color: color ?? draft.color,
      pinned: pinned ?? draft.pinned,
      archived: archived ?? draft.archived,
      trashed: trashed ?? draft.trashed,
      reminderAt: draft.reminderAt,
      notificationId: draft.notificationId,
      attachments: attachments ?? draft.attachments,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      deleted: draft.deleted,
    );
  }

  Future<void> _uploadAttachment() async {
    setState(() => uploading = true);
    try {
      final attachment = await ref.read(attachmentsServiceProvider).pickAndUploadImage();
      if (attachment != null) {
        setState(() => draft = _copyDraft(attachments: [attachment, ...draft.attachments]));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Upload failed: $error')));
      }
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Future<void> _save() async {
    setState(() => saving = true);
    final reminderText = reminderController.text.trim();
    int? reminderAt;
    if (reminderText.isNotEmpty) {
      DateTime? parsed;
      try {
        parsed = DateFormat('yyyy-MM-dd HH:mm').parseStrict(reminderText);
      } catch (_) {
        parsed = null;
      }
      if (parsed == null) {
        setState(() => saving = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Use reminder format YYYY-MM-DD HH:mm')));
        return;
      }
      reminderAt = parsed.millisecondsSinceEpoch;
    }

    final note = NotePayload(
      id: draft.id,
      title: titleController.text.trim().isEmpty ? null : titleController.text.trim(),
      body: draft.type == NoteType.text && bodyController.text.trim().isNotEmpty ? bodyController.text.trim() : null,
      type: draft.type,
      checklist: draft.type == NoteType.checklist
          ? draft.checklist
              .asMap()
              .entries
              .where((entry) => entry.value.text.trim().isNotEmpty)
              .map((entry) => entry.value.copyWith(sortOrder: entry.key))
              .toList()
          : const [],
      labels: draft.labels,
      color: draft.color,
      pinned: draft.pinned,
      archived: draft.archived,
      trashed: draft.trashed,
      reminderAt: reminderAt,
      notificationId: draft.notificationId,
      attachments: draft.attachments,
      createdAt: draft.createdAt ?? DateTime.now().millisecondsSinceEpoch,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
      deleted: draft.deleted,
    );
    await ref.read(notesControllerProvider.notifier).save(note);
    if (mounted) context.pop();
  }
}

class _ChecklistEditor extends StatelessWidget {
  const _ChecklistEditor({required this.items, required this.onChanged});

  final List<ChecklistItem> items;
  final ValueChanged<List<ChecklistItem>> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...items.asMap().entries.map((entry) {
          final index = entry.key;
          final item = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Checkbox(
                  value: item.checked,
                  onChanged: (_) => onChanged(items.map((candidate) => candidate.id == item.id ? candidate.copyWith(checked: !candidate.checked) : candidate).toList()),
                ),
                Expanded(
                  child: TextField(
                    controller: TextEditingController(text: item.text)..selection = TextSelection.collapsed(offset: item.text.length),
                    decoration: InputDecoration(labelText: 'Item ${index + 1}'),
                    onChanged: (value) => onChanged(items.map((candidate) => candidate.id == item.id ? candidate.copyWith(text: value) : candidate).toList()),
                  ),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => onChanged(items.where((candidate) => candidate.id != item.id).toList())),
              ],
            ),
          );
        }),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: () => onChanged([...items, ChecklistItem(id: const Uuid().v4(), text: '', checked: false, sortOrder: items.length)]),
            icon: const Icon(Icons.add),
            label: const Text('Add item'),
          ),
        ),
      ],
    );
  }
}
