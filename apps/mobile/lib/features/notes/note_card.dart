import 'package:flutter/material.dart';

import '../../core/models.dart';

class NoteCard extends StatelessWidget {
  const NoteCard({
    super.key,
    required this.note,
    required this.labels,
    required this.onTap,
    required this.onPin,
    required this.onArchive,
    required this.onTrash,
    required this.onRestore,
    required this.onDeleteForever,
    required this.inTrash,
  });

  final NotePayload note;
  final List<LabelModel> labels;
  final VoidCallback onTap;
  final VoidCallback onPin;
  final VoidCallback onArchive;
  final VoidCallback onTrash;
  final VoidCallback onRestore;
  final VoidCallback onDeleteForever;
  final bool inTrash;

  @override
  Widget build(BuildContext context) {
    final foreground = Colors.black87;
    return Card(
      color: Color(0xff000000 | note.color),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      note.title?.trim().isNotEmpty == true ? note.title! : 'Untitled note',
                      style: TextStyle(fontWeight: FontWeight.w700, color: foreground),
                    ),
                  ),
                  if (note.pinned) Icon(Icons.push_pin, size: 16, color: foreground),
                ],
              ),
              const SizedBox(height: 8),
              if (note.type == NoteType.checklist)
                ...note.checklist.take(4).map(
                      (item) => Row(
                        children: [
                          Icon(
                            item.checked ? Icons.check_box : Icons.check_box_outline_blank,
                            size: 16,
                            color: foreground,
                          ),
                          const SizedBox(width: 6),
                          Expanded(child: Text(item.text, maxLines: 1, overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                    )
              else
                Text(
                  note.body ?? '',
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: foreground),
                ),
              const SizedBox(height: 8),
              Builder(
                builder: (context) {
                  int imgCount = 0, audCount = 0, vidCount = 0, othCount = 0;
                  for (final att in note.attachments) {
                    final mime = att.mimeType?.toLowerCase() ?? '';
                    if (mime.startsWith('image/')) imgCount++;
                    else if (mime.startsWith('audio/')) audCount++;
                    else if (mime.startsWith('video/')) vidCount++;
                    else othCount++;
                  }
                  if (note.attachments.isEmpty) return const SizedBox.shrink();
                  
                  Widget _icon(IconData icon, int count) => count > 0 
                    ? Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 14, color: foreground), const SizedBox(width: 4), Text('$count', style: TextStyle(color: foreground, fontSize: 12))])
                    : const SizedBox.shrink();

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: Wrap(
                      spacing: 8,
                      children: [
                        _icon(Icons.image_outlined, imgCount),
                        _icon(Icons.music_note_outlined, audCount),
                        _icon(Icons.play_circle_outline, vidCount),
                        _icon(Icons.attach_file, othCount),
                      ],
                    ),
                  );
                }
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: labels.map((label) => Chip(label: Text(label.name), visualDensity: VisualDensity.compact)).toList(),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  IconButton(icon: const Icon(Icons.push_pin_outlined), onPressed: onPin),
                  if (inTrash) ...[
                    IconButton(icon: const Icon(Icons.restore_outlined), onPressed: onRestore),
                    IconButton(icon: const Icon(Icons.close), onPressed: onDeleteForever),
                  ] else ...[
                    IconButton(icon: const Icon(Icons.archive_outlined), onPressed: onArchive),
                    IconButton(icon: const Icon(Icons.delete_outline), onPressed: onTrash),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
