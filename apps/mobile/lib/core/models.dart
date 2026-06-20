enum NoteType { text, checklist }

NoteType noteTypeFromJson(Object? value) {
  return value == 'CHECKLIST' ? NoteType.checklist : NoteType.text;
}

String noteTypeToJson(NoteType value) {
  return value == NoteType.checklist ? 'CHECKLIST' : 'TEXT';
}

class ChecklistItem {
  const ChecklistItem({
    required this.id,
    required this.text,
    required this.checked,
    required this.sortOrder,
  });

  final String id;
  final String text;
  final bool checked;
  final int sortOrder;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) {
    return ChecklistItem(
      id: json['id'] as String,
      text: (json['text'] as String?) ?? '',
      checked: json['checked'] == true,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'checked': checked,
        'sortOrder': sortOrder,
      };

  ChecklistItem copyWith({
    String? id,
    String? text,
    bool? checked,
    int? sortOrder,
  }) {
    return ChecklistItem(
      id: id ?? this.id,
      text: text ?? this.text,
      checked: checked ?? this.checked,
      sortOrder: sortOrder ?? this.sortOrder,
    );
  }
}

class AttachmentMeta {
  const AttachmentMeta({
    required this.id,
    required this.uri,
    this.mimeType,
    this.fileName,
    required this.createdAt,
  });

  final String id;
  final String uri;
  final String? mimeType;
  final String? fileName;
  final int createdAt;

  factory AttachmentMeta.fromJson(Map<String, dynamic> json) {
    return AttachmentMeta(
      id: json['id'] as String,
      uri: json['uri'] as String,
      mimeType: json['mimeType'] as String?,
      fileName: json['fileName'] as String?,
      createdAt: (json['createdAt'] as num).toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'uri': uri,
        if (mimeType != null) 'mimeType': mimeType,
        if (fileName != null) 'fileName': fileName,
        'createdAt': createdAt,
      };
}

class LabelModel {
  const LabelModel({
    required this.id,
    required this.name,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final int updatedAt;

  factory LabelModel.fromJson(Map<String, dynamic> json) {
    return LabelModel(
      id: json['id'] as String,
      name: json['name'] as String,
      updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'updatedAt': updatedAt,
      };
}

class NotePayload {
  const NotePayload({
    required this.id,
    this.title,
    this.body,
    this.type = NoteType.text,
    this.checklist = const [],
    this.labels = const [],
    this.color = 0xffffff,
    this.pinned = false,
    this.archived = false,
    this.trashed = false,
    this.reminderAt,
    this.notificationId,
    this.attachments = const [],
    this.createdAt,
    required this.updatedAt,
    this.deleted = false,
  });

  final String id;
  final String? title;
  final String? body;
  final NoteType type;
  final List<ChecklistItem> checklist;
  final List<String> labels;
  final int color;
  final bool pinned;
  final bool archived;
  final bool trashed;
  final int? reminderAt;
  final String? notificationId;
  final List<AttachmentMeta> attachments;
  final int? createdAt;
  final int updatedAt;
  final bool deleted;

  factory NotePayload.fromJson(Map<String, dynamic> json) {
    return NotePayload(
      id: json['id'] as String,
      title: json['title'] as String?,
      body: json['body'] as String?,
      type: noteTypeFromJson(json['type']),
      checklist: ((json['checklist'] as List?) ?? const [])
          .whereType<Map>()
          .map((item) => ChecklistItem.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      labels: ((json['labels'] as List?) ?? const []).map((item) => item.toString()).toList(),
      color: (json['color'] as num?)?.toInt() ?? 0xffffff,
      pinned: json['pinned'] == true,
      archived: json['archived'] == true,
      trashed: json['trashed'] == true,
      reminderAt: (json['reminderAt'] as num?)?.toInt(),
      notificationId: json['notificationId'] as String?,
      attachments: ((json['attachments'] as List?) ?? const [])
          .whereType<Map>()
          .map((item) => AttachmentMeta.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      createdAt: (json['createdAt'] as num?)?.toInt(),
      updatedAt: (json['updatedAt'] as num?)?.toInt() ?? 0,
      deleted: json['deleted'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'type': noteTypeToJson(type),
        'checklist': checklist.map((item) => item.toJson()).toList(),
        'labels': labels,
        'color': color,
        'pinned': pinned,
        'archived': archived,
        'trashed': trashed,
        'reminderAt': reminderAt,
        'notificationId': notificationId,
        'attachments': attachments.map((item) => item.toJson()).toList(),
        'createdAt': createdAt,
        'updatedAt': updatedAt,
        'deleted': deleted,
      };

  NotePayload copyWith({
    String? title,
    String? body,
    NoteType? type,
    List<ChecklistItem>? checklist,
    List<String>? labels,
    int? color,
    bool? pinned,
    bool? archived,
    bool? trashed,
    int? reminderAt,
    String? notificationId,
    List<AttachmentMeta>? attachments,
    int? createdAt,
    int? updatedAt,
    bool? deleted,
  }) {
    return NotePayload(
      id: id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      checklist: checklist ?? this.checklist,
      labels: labels ?? this.labels,
      color: color ?? this.color,
      pinned: pinned ?? this.pinned,
      archived: archived ?? this.archived,
      trashed: trashed ?? this.trashed,
      reminderAt: reminderAt ?? this.reminderAt,
      notificationId: notificationId ?? this.notificationId,
      attachments: attachments ?? this.attachments,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deleted: deleted ?? this.deleted,
    );
  }
}
