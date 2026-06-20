import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;

import '../../core/api_client.dart';
import '../../core/models.dart';

final attachmentsServiceProvider = Provider<AttachmentsService>((ref) {
  return AttachmentsService(ref.watch(apiClientProvider));
});

class AttachmentsService {
  AttachmentsService(this.api);

  final ApiClient api;

  Future<AttachmentMeta?> pickAndUploadImage() async {
    final result = await FilePicker.platform.pickFiles();
    if (result == null || result.files.single.path == null) return null;
    
    final file = File(result.files.single.path!);
    final ext = p.extension(file.path).toLowerCase();
    
    // Attempt basic MIME type mapping since FilePicker doesn't provide it on all platforms reliably
    String? mimeType;
    if (ext == '.jpg' || ext == '.jpeg') mimeType = 'image/jpeg';
    else if (ext == '.png') mimeType = 'image/png';
    else if (ext == '.mp4') mimeType = 'video/mp4';
    else if (ext == '.mp3') mimeType = 'audio/mpeg';
    else if (ext == '.pdf') mimeType = 'application/pdf';
    
    return api.uploadAttachment(file, mimeType);
  }
}
