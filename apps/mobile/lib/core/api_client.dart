import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http_parser/http_parser.dart';

import 'models.dart';
import 'settings_controller.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final settings = ref.watch(settingsProvider);
  return ApiClient(settings);
});

class ApiClient {
  ApiClient(this.settings)
      : dio = Dio(
          BaseOptions(
            baseUrl: settings.apiBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

  final SettingsState settings;
  final Dio dio;

  Map<String, String> get _headers => {
        if (settings.sessionToken != null) 'Authorization': 'Bearer ${settings.sessionToken}',
        if (settings.sessionPassphrase.isNotEmpty) 'x-passphrase': settings.sessionPassphrase,
      };

  Future<String> login(String email, String password) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return response.data?['token'] as String;
  }

  Future<SyncPullResult> pull(int since) async {
    final response = await dio.get<Map<String, dynamic>>(
      '/sync/pull',
      queryParameters: {'since': since},
      options: Options(headers: _headers),
    );
    final data = response.data ?? {};
    return SyncPullResult(
      notes: ((data['notes'] as List?) ?? const [])
          .whereType<Map>()
          .map((item) => NotePayload.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      labels: ((data['labels'] as List?) ?? const [])
          .whereType<Map>()
          .map((item) => LabelModel.fromJson(Map<String, dynamic>.from(item)))
          .toList(),
      serverTime: (data['serverTime'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Future<int> push(List<NotePayload> notes) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/sync/push',
      data: {'notes': notes.map((note) => note.toJson()).toList()},
      options: Options(headers: _headers),
    );
    return (response.data?['serverTime'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch;
  }

  Future<LabelModel> createLabel(String name) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/labels',
      data: {'name': name},
      options: Options(headers: _headers),
    );
    return LabelModel.fromJson(Map<String, dynamic>.from(response.data?['label'] as Map));
  }

  Future<LabelModel> updateLabel(String id, String name) async {
    final response = await dio.put<Map<String, dynamic>>(
      '/labels/$id',
      data: {'name': name},
      options: Options(headers: _headers),
    );
    return LabelModel.fromJson(Map<String, dynamic>.from(response.data?['label'] as Map));
  }

  Future<void> deleteLabel(String id) async {
    await dio.delete('/labels/$id', options: Options(headers: _headers));
  }

  Future<AttachmentMeta> uploadAttachment(File file, String? mimeType) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.uri.pathSegments.last,
        contentType: mimeType == null ? null : MediaType.parse(mimeType),
      ),
    });
    final response = await dio.post<Map<String, dynamic>>(
      '/attachments',
      data: form,
      options: Options(headers: _headers),
    );
    return AttachmentMeta.fromJson(Map<String, dynamic>.from(response.data?['attachment'] as Map));
  }
}

class SyncPullResult {
  const SyncPullResult({
    required this.notes,
    required this.labels,
    required this.serverTime,
  });

  final List<NotePayload> notes;
  final List<LabelModel> labels;
  final int serverTime;
}
