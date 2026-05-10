import 'package:flutter_test/flutter_test.dart';
import 'package:notenest_mobile/core/models.dart';

void main() {
  test('note payload round trips json', () {
    const note = NotePayload(
      id: 'note-1',
      title: 'Plan',
      body: 'Ship rewrite',
      updatedAt: 123,
      labels: ['work'],
      attachments: [AttachmentMeta(id: 'att-1', uri: '/api/attachments/att-1', createdAt: 123)],
    );

    final copy = NotePayload.fromJson(note.toJson());

    expect(copy.id, note.id);
    expect(copy.title, note.title);
    expect(copy.attachments.single.id, 'att-1');
  });
}
