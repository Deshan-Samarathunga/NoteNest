import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';

final attachmentsServiceProvider = Provider<AttachmentsService>((ref) {
  return AttachmentsService(ref.watch(apiClientProvider));
});

class AttachmentsService {
  AttachmentsService(this.api);

  final ApiClient api;
  final _picker = ImagePicker();

  Future<AttachmentMeta?> pickAndUploadImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 82);
    if (picked == null) return null;
    return api.uploadAttachment(File(picked.path), picked.mimeType);
  }
}
