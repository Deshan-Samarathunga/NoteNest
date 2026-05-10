import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class NoteNestScaffold extends StatelessWidget {
  const NoteNestScaffold({
    super.key,
    required this.title,
    required this.selectedPath,
    required this.body,
    this.actions,
    this.floatingActionButton,
  });

  final String title;
  final String selectedPath;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions),
      drawer: NavigationDrawer(
        selectedIndex: ['/', '/archive', '/trash', '/labels', '/settings'].indexOf(selectedPath),
        onDestinationSelected: (index) {
          Navigator.of(context).pop();
          final path = ['/', '/archive', '/trash', '/labels', '/settings'][index];
          context.go(path);
        },
        children: const [
          DrawerHeader(child: Text('NoteNest', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700))),
          NavigationDrawerDestination(icon: Icon(Icons.notes_outlined), label: Text('Notes')),
          NavigationDrawerDestination(icon: Icon(Icons.archive_outlined), label: Text('Archive')),
          NavigationDrawerDestination(icon: Icon(Icons.delete_outline), label: Text('Trash')),
          NavigationDrawerDestination(icon: Icon(Icons.label_outline), label: Text('Labels')),
          NavigationDrawerDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
        ],
      ),
      body: body,
      floatingActionButton: floatingActionButton,
    );
  }
}
