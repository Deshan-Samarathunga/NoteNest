'use client';

import {
  Archive,
  Bell,
  Check,
  Download,
  File as FileIcon,
  Grid2X2,
  Image as ImageIcon,
  List,
  LogIn,
  LogOut,
  Music,
  Paperclip,
  Pin,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Tags,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttachmentMeta, ChecklistItem, Label, NotePayload, NoteType } from '@/lib/sync/types';
import {
  createLabel,
  deleteLabel,
  getStorageQuota,
  login,
  pullNotes,
  pushNotes,
  Session,
  updateLabel,
  uploadAttachment,
  UploadProgress
} from './apiClient';
import {
  addMutation,
  clearLocalCache,
  clearMutations,
  getCachedLabels,
  getCachedNotes,
  getLastSync,
  getSettings,
  listMutations,
  saveCachedLabels,
  saveCachedNotes,
  saveSettings,
  setLastSync,
  WebSettings
} from './localCache';

const COLORS = [0xffffff, 0xfff3c1, 0xffe0e0, 0xdcedc8, 0xc8e6ff, 0xe1bee7];

type ViewMode = 'notes' | 'archive' | 'trash' | 'labels' | 'settings';
type SortMode = 'updatedAt' | 'createdAt';
type EditorMode = { kind: 'new' } | { kind: 'edit'; note: NotePayload };

function colorHex(value?: number) {
  return `#${(value ?? 0xffffff).toString(16).padStart(6, '0')}`;
}

function noteTitle(note: NotePayload) {
  return note.title?.trim() || 'Untitled note';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSpeed(bps: number) {
  return `${formatBytes(bps)}/s`;
}

function nowNote(): NotePayload {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: null,
    body: null,
    type: 'TEXT',
    checklist: [],
    labels: [],
    color: 0xffffff,
    pinned: false,
    archived: false,
    trashed: false,
    reminderAt: null,
    notificationId: null,
    attachments: [],
    createdAt: now,
    updatedAt: now
  };
}

function mergeServerNotes(serverNotes: NotePayload[], localNotes: NotePayload[]) {
  const local = new Map(localNotes.map((note) => [note.id, note]));
  for (const remote of serverNotes) {
    const current = local.get(remote.id);
    if (remote.deleted) {
      local.delete(remote.id);
      continue;
    }
    if (!current || (remote.updatedAt ?? 0) >= (current.updatedAt ?? 0)) {
      local.set(remote.id, remote);
    }
  }
  return Array.from(local.values());
}

function toDateTimeLocal(timestamp?: number | null) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function scheduleBrowserReminder(note: NotePayload) {
  if (!note.reminderAt || typeof window === 'undefined' || !('Notification' in window)) return;
  const delay = note.reminderAt - Date.now();
  if (delay <= 0 || delay > 2_147_483_647) return;

  const schedule = () => {
    window.setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(noteTitle(note), { body: note.body || 'Open NoteNest' });
      }
    }, delay);
  };

  if (Notification.permission === 'granted') schedule();
  else if (Notification.permission === 'default') Notification.requestPermission().then((value) => value === 'granted' && schedule());
}

export function NotesApp() {
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [settings, setSettingsState] = useState<WebSettings>({
    token: null,
    theme: 'system',
    layout: 'grid',
    purgeDays: 7
  });
  const [passphrase, setPassphrase] = useState('');
  const [view, setView] = useState<ViewMode>('notes');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('updatedAt');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<number | null>(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [status, setStatus] = useState('Offline cache ready');
  const [syncing, setSyncing] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const session: Session = useMemo(() => ({ token: settings.token, passphrase }), [settings.token, passphrase]);

  useEffect(() => {
    const loadedSettings = getSettings();
    setSettingsState(loadedSettings);
    setNotes(getCachedNotes());
    setLabels(getCachedLabels());
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    notes.forEach(scheduleBrowserReminder);
  }, [notes]);

  const setSettings = (next: WebSettings) => {
    setSettingsState(next);
    saveSettings(next);
  };

  const persistNotes = (next: NotePayload[]) => {
    setNotes(next);
    saveCachedNotes(next);
  };

  const persistLabels = (next: Label[]) => {
    setLabels(next);
    saveCachedLabels(next);
  };

  const runSync = async () => {
    if (!settings.token) {
      setStatus('Log in to sync with MEGA');
      return;
    }

    setSyncing(true);
    try {
      const pending = listMutations();
      if (pending.length > 0) {
        await pushNotes(session, pending.map((item) => item.payload));
        clearMutations();
      }

      const pulled = await pullNotes(session, getLastSync());
      const merged = mergeServerNotes(pulled.notes, getCachedNotes());
      persistNotes(merged);
      if (pulled.labels) persistLabels(pulled.labels);
      setLastSync(pulled.serverTime);
      setStatus(`Synced ${new Date(pulled.serverTime).toLocaleTimeString()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const queueSave = (note: NotePayload) => {
    const updated = { ...note, updatedAt: Date.now() };
    const next = notes.some((item) => item.id === updated.id)
      ? notes.map((item) => (item.id === updated.id ? updated : item))
      : [updated, ...notes];
    persistNotes(next);
    addMutation(updated);
    scheduleBrowserReminder(updated);
    setEditor(null);
    runSync();
  };

  const patchNote = (note: NotePayload, patch: Partial<NotePayload>) => {
    queueSave({ ...note, ...patch, updatedAt: Date.now() });
  };

  const trashNote = (note: NotePayload) => {
    patchNote(note, { trashed: true, archived: false });
  };

  const restoreNote = (note: NotePayload) => {
    patchNote(note, { trashed: false, deleted: false });
  };

  const deleteForever = (note: NotePayload) => {
    const deleted = { ...note, trashed: true, deleted: true, updatedAt: Date.now() };
    persistNotes(notes.filter((item) => item.id !== note.id));
    addMutation(deleted);
    runSync();
  };

  const purgeTrash = () => {
    const cutoff = Date.now() - settings.purgeDays * 24 * 60 * 60 * 1000;
    notes.filter((note) => note.trashed && !note.deleted && note.updatedAt < cutoff).forEach(deleteForever);
  };

  const doLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const result = await login(loginUser.trim(), loginPass);
      setSettings({ ...settings, token: result.token });
      setLoginPass('');
      setStatus('Logged in');
      setTimeout(() => runSync(), 0);
    } catch {
      setLoginError('Login failed — check your Mega.nz email and password.');
      setStatus('Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const visibleNotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes
      .filter((note) => {
        if (view === 'archive') {
          if (!note.archived || note.trashed || note.deleted) return false;
        } else if (view === 'trash') {
          if (!note.trashed || note.deleted) return false;
        } else if (view === 'notes') {
          if (note.archived || note.trashed || note.deleted) return false;
        } else {
          return false;
        }

        if (selectedLabel && !(note.labels || []).includes(selectedLabel)) return false;
        if (colorFilter !== null && note.color !== colorFilter) return false;
        if (pinnedOnly && !note.pinned) return false;
        if (!term) return true;
        const checklist = (note.checklist || []).map((item) => item.text).join(' ');
        return `${note.title || ''} ${note.body || ''} ${checklist}`.toLowerCase().includes(term);
      })
      .sort((a, b) => Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0));
  }, [notes, search, sortBy, selectedLabel, colorFilter, pinnedOnly, view]);

  const labelMap = useMemo(() => new Map(labels.map((label) => [label.id, label])), [labels]);

  const groupedNotes = useMemo(
    () => ({
      pinned: visibleNotes.filter((note) => note.pinned),
      other: visibleNotes.filter((note) => !note.pinned)
    }),
    [visibleNotes]
  );

  // Don't render anything until settings are loaded from localStorage
  if (!settingsLoaded) return null;

  // Show login screen when not authenticated
  if (!settings.token) {
    return (
      <LoginScreen
        email={loginUser}
        setEmail={setLoginUser}
        password={loginPass}
        setPassword={setLoginPass}
        onSubmit={doLogin}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  const addLabel = async () => {
    const name = newLabel.trim();
    if (!name || !settings.token) return;
    const created = await createLabel(session, name);
    persistLabels([...labels, created]);
    setNewLabel('');
  };

  const renameLabel = async (label: Label, name: string) => {
    if (!name.trim() || !settings.token) return;
    const updated = await updateLabel(session, label.id, name.trim());
    persistLabels(labels.map((item) => (item.id === label.id ? updated : item)));
  };

  const removeLabel = async (label: Label) => {
    if (settings.token) await deleteLabel(session, label.id);
    persistLabels(labels.filter((item) => item.id !== label.id));
    persistNotes(notes.map((note) => ({ ...note, labels: (note.labels || []).filter((id) => id !== label.id) })));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>NoteNest</span>
        </div>
        <nav className="nav-list">
          <NavButton active={view === 'notes'} icon={<List />} label="Notes" onClick={() => setView('notes')} />
          <NavButton active={view === 'archive'} icon={<Archive />} label="Archive" onClick={() => setView('archive')} />
          <NavButton active={view === 'trash'} icon={<Trash2 />} label="Trash" onClick={() => setView('trash')} />
          <NavButton active={view === 'labels'} icon={<Tags />} label="Labels" onClick={() => setView('labels')} />
          <NavButton active={view === 'settings'} icon={<Settings />} label="Settings" onClick={() => setView('settings')} />
        </nav>
        <div className="sync-panel">
          <button className="primary compact" onClick={runSync} disabled={syncing || !settings.token}>
            <RefreshCw size={16} />
            {syncing ? 'Syncing' : 'Sync'}
          </button>
          <p>{status}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div className="search-field">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" />
          </div>
          <div className="toolbar-actions">
            <button className="icon-button" title="List layout" onClick={() => setSettings({ ...settings, layout: 'list' })}>
              <List size={18} />
            </button>
            <button className="icon-button" title="Grid layout" onClick={() => setSettings({ ...settings, layout: 'grid' })}>
              <Grid2X2 size={18} />
            </button>
            <button className="primary" onClick={() => setEditor({ kind: 'new' })}>
              <Plus size={18} />
              New
            </button>
          </div>
        </header>

        {view === 'labels' ? (
          <LabelsPanel
            labels={labels}
            newLabel={newLabel}
            setNewLabel={setNewLabel}
            addLabel={addLabel}
            renameLabel={renameLabel}
            removeLabel={removeLabel}
          />
        ) : view === 'settings' ? (
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            passphrase={passphrase}
            setPassphrase={setPassphrase}
            loginUser={loginUser}
            setLoginUser={setLoginUser}
            loginPass={loginPass}
            setLoginPass={setLoginPass}
            doLogin={doLogin}
            logout={() => setSettings({ ...settings, token: null })}
            clearCache={() => {
              clearLocalCache();
              setNotes([]);
              setLabels([]);
              setStatus('Local cache cleared');
            }}
            purgeTrash={purgeTrash}
          />
        ) : (
          <>
            <Filters
              labels={labels}
              selectedLabel={selectedLabel}
              setSelectedLabel={setSelectedLabel}
              colorFilter={colorFilter}
              setColorFilter={setColorFilter}
              pinnedOnly={pinnedOnly}
              setPinnedOnly={setPinnedOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
            <NotesSection
              notes={groupedNotes.pinned}
              labelMap={labelMap}
              layout={settings.layout}
              title="Pinned"
              onOpen={(note) => setEditor({ kind: 'edit', note })}
              onPatch={patchNote}
              onTrash={trashNote}
              onRestore={restoreNote}
              onDeleteForever={deleteForever}
              view={view}
            />
            <NotesSection
              notes={groupedNotes.other}
              labelMap={labelMap}
              layout={settings.layout}
              title={groupedNotes.pinned.length ? 'Others' : ''}
              onOpen={(note) => setEditor({ kind: 'edit', note })}
              onPatch={patchNote}
              onTrash={trashNote}
              onRestore={restoreNote}
              onDeleteForever={deleteForever}
              view={view}
            />
            {!visibleNotes.length ? (
              <div className="empty-state">
                <h2>No notes here</h2>
                <button className="primary" onClick={() => setEditor({ kind: 'new' })}>
                  <Plus size={18} />
                  New note
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {editor ? (
        <NoteEditor
          mode={editor}
          labels={labels}
          session={session}
          onClose={() => setEditor(null)}
          onSave={queueSave}
        />
      ) : null}
    </main>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  loading,
  error
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="brand-mark">N</span>
          <span>NoteNest</span>
        </div>
        <p className="login-subtitle">
          Sign in with your <strong>Mega.nz</strong> account.
          <br />
          Your notes are stored in your own MEGA cloud drive.
        </p>
        {error ? <p className="login-error">{error}</p> : null}
        <label>
          Email
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Password
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Your Mega.nz password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <button id="login-submit" className="login-btn" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={18} />
              Sign in
            </>
          )}
        </button>
        <p className="login-note">
          Only Mega.nz accounts <strong>without 2FA</strong> are supported.
        </p>
      </form>
    </div>
  );
}

function Filters({
  labels,
  selectedLabel,
  setSelectedLabel,
  colorFilter,
  setColorFilter,
  pinnedOnly,
  setPinnedOnly,
  sortBy,
  setSortBy
}: {
  labels: Label[];
  selectedLabel: string | null;
  setSelectedLabel: (id: string | null) => void;
  colorFilter: number | null;
  setColorFilter: (color: number | null) => void;
  pinnedOnly: boolean;
  setPinnedOnly: (value: boolean) => void;
  sortBy: SortMode;
  setSortBy: (value: SortMode) => void;
}) {
  return (
    <div className="filters">
      <button className={!selectedLabel && !colorFilter && !pinnedOnly ? 'chip selected' : 'chip'} onClick={() => {
        setSelectedLabel(null);
        setColorFilter(null);
        setPinnedOnly(false);
      }}>
        All
      </button>
      <button className={pinnedOnly ? 'chip selected' : 'chip'} onClick={() => setPinnedOnly(!pinnedOnly)}>
        Pinned
      </button>
      {labels.map((label) => (
        <button
          className={selectedLabel === label.id ? 'chip selected' : 'chip'}
          key={label.id}
          onClick={() => setSelectedLabel(selectedLabel === label.id ? null : label.id)}
        >
          {label.name}
        </button>
      ))}
      {COLORS.map((color) => (
        <button
          aria-label={`Filter by ${colorHex(color)}`}
          className={colorFilter === color ? 'swatch selected' : 'swatch'}
          key={color}
          onClick={() => setColorFilter(colorFilter === color ? null : color)}
          style={{ backgroundColor: colorHex(color) }}
        />
      ))}
      <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortMode)}>
        <option value="updatedAt">Updated</option>
        <option value="createdAt">Created</option>
      </select>
    </div>
  );
}

function NotesSection({
  notes,
  labelMap,
  layout,
  title,
  view,
  onOpen,
  onPatch,
  onTrash,
  onRestore,
  onDeleteForever
}: {
  notes: NotePayload[];
  labelMap: Map<string, Label>;
  layout: 'grid' | 'list';
  title: string;
  view: ViewMode;
  onOpen: (note: NotePayload) => void;
  onPatch: (note: NotePayload, patch: Partial<NotePayload>) => void;
  onTrash: (note: NotePayload) => void;
  onRestore: (note: NotePayload) => void;
  onDeleteForever: (note: NotePayload) => void;
}) {
  if (!notes.length) return null;
  return (
    <section className="notes-section">
      {title ? <h2>{title}</h2> : null}
      <div className={layout === 'grid' ? 'notes-grid' : 'notes-list'}>
        {notes.map((note) => (
          <article className={`note-card ${note.color && note.color !== 0xffffff ? 'colored-note' : ''}`} key={note.id} style={{ backgroundColor: note.color && note.color !== 0xffffff ? colorHex(note.color) : 'var(--surface)' }}>
            <button className="note-body-button" onClick={() => onOpen(note)}>
              <div className="note-card-header">
                <h3>{noteTitle(note)}</h3>
                {note.pinned ? <Pin size={16} fill="currentColor" /> : null}
              </div>
              {note.type === 'CHECKLIST' ? (
                <ul className="checklist-preview">
                  {(note.checklist || []).slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <span className={item.checked ? 'checked-box checked' : 'checked-box'} />
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{note.body}</p>
              )}
              <div className="label-row">
                {(note.labels || [])
                  .map((id) => labelMap.get(id))
                  .filter((label): label is Label => Boolean(label))
                  .map((label) => (
                    <span className="mini-label" key={label.id}>
                      {label.name}
                    </span>
                  ))}
              </div>
              {(() => {
                const atts = note.attachments || [];
                if (!atts.length) return null;
                const counts = atts.reduce((acc, att) => {
                  const mime = (att.mimeType || '').toLowerCase();
                  if (mime.startsWith('image/')) acc.image++;
                  else if (mime.startsWith('audio/')) acc.audio++;
                  else if (mime.startsWith('video/')) acc.video++;
                  else acc.other++;
                  return acc;
                }, { image: 0, audio: 0, video: 0, other: 0 });

                return (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {counts.image > 0 && (
                      <span className="attachment-count">
                        <ImageIcon size={14} /> {counts.image}
                      </span>
                    )}
                    {counts.audio > 0 && (
                      <span className="attachment-count">
                        <Music size={14} /> {counts.audio}
                      </span>
                    )}
                    {counts.video > 0 && (
                      <span className="attachment-count">
                        <Play size={14} /> {counts.video}
                      </span>
                    )}
                    {counts.other > 0 && (
                      <span className="attachment-count">
                        <Paperclip size={14} /> {counts.other}
                      </span>
                    )}
                  </div>
                );
              })()}
            </button>
            <div className="note-actions">
              <button title="Pin" onClick={() => onPatch(note, { pinned: !note.pinned })}>
                <Pin size={16} />
              </button>
              {view === 'trash' ? (
                <>
                  <button title="Restore" onClick={() => onRestore(note)}>
                    <RefreshCw size={16} />
                  </button>
                  <button title="Delete forever" onClick={() => onDeleteForever(note)}>
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button title="Archive" onClick={() => onPatch(note, { archived: !note.archived })}>
                    <Archive size={16} />
                  </button>
                  <button title="Trash" onClick={() => onTrash(note)}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AttachmentPreview({ session, attachment, onRemove }: { session: Session; attachment: AttachmentMeta; onRemove: () => void }) {
  let preview = null;
  let mime = '';

  try {
    mime = attachment?.mimeType?.toLowerCase() || '';
    const tokenUri = attachment?.uri ? `${attachment.uri}?token=${session.token}` : '';

    if (mime.startsWith('image/')) {
      preview = <img src={tokenUri} alt={attachment.fileName || 'Image'} className="attachment-image" loading="lazy" />;
    } else if (mime.startsWith('video/')) {
      preview = <video src={tokenUri} controls className="attachment-video" preload="metadata" />;
    } else if (mime.startsWith('audio/')) {
      preview = <audio src={tokenUri} controls className="attachment-audio" preload="metadata" />;
    } else if (mime === 'application/pdf') {
      preview = <embed src={tokenUri} type="application/pdf" className="attachment-pdf" />;
    } else {
      preview = (
        <a href={tokenUri} target="_blank" rel="noreferrer" className="attachment-generic">
          <FileIcon size={32} />
          <span className="attachment-name">{attachment.fileName || 'Attachment'}</span>
          {attachment.fileSize ? <span className="attachment-size">{formatBytes(attachment.fileSize)}</span> : null}
          <span className="attachment-download">
            <Download size={14} /> Download
          </span>
        </a>
      );
    }
  } catch (err) {
    console.error('Attachment render error:', err);
  }

  // Bulletproof fallback
  if (!preview) {
    preview = (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>
        <p>Corrupted or unreadable attachment</p>
      </div>
    );
  }

  return (
    <div className="attachment-card">
      <div className="attachment-card-header" style={{ padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
          {attachment?.fileName || 'Attachment'} ({mime || 'unknown type'})
        </span>
        <button type="button" className="attachment-remove" onClick={onRemove} aria-label="Remove attachment" style={{ position: 'static', background: 'transparent', color: 'var(--text)', width: 'auto', height: 'auto', padding: '4px' }}>
          <X size={14} />
        </button>
      </div>
      <div className="attachment-card-content">{preview}</div>
    </div>
  );
}

function NoteEditor({
  mode,
  labels,
  session,
  onClose,
  onSave
}: {
  mode: EditorMode;
  labels: Label[];
  session: Session;
  onClose: () => void;
  onSave: (note: NotePayload) => void;
}) {
  const initial = mode.kind === 'edit' ? mode.note : nowNote();
  const [draft, setDraft] = useState<NotePayload>(initial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const update = (patch: Partial<NotePayload>) => setDraft((current) => ({ ...current, ...patch }));
  const checklist = draft.checklist || [];

  const pickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    setProgress(null);
    try {
      // Check quota first (but don't abort if the quota check itself fails)
      try {
        const quota = await getStorageQuota(session);
        if (file.size > quota.spaceFree) {
          setUploadError(`Not enough MEGA storage. You have ${formatBytes(quota.spaceFree)} free but this file is ${formatBytes(file.size)}.`);
          setUploading(false);
          event.target.value = '';
          return;
        }
      } catch (quotaError) {
        console.warn('Could not check storage quota, proceeding with upload anyway:', quotaError);
      }

      const attachment = await uploadAttachment(session, file, setProgress);
      setDraft((current) => ({
        ...current,
        attachments: [attachment, ...(current.attachments || [])]
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
      event.target.value = '';
    }
  };

  const save = () => {
    onSave({
      ...draft,
      title: draft.title?.trim() || null,
      body: draft.type === 'TEXT' ? draft.body?.trim() || null : null,
      checklist: draft.type === 'CHECKLIST' ? checklist.filter((item) => item.text.trim()) : [],
      labels: draft.labels || [],
      attachments: draft.attachments || [],
      updatedAt: Date.now()
    });
  };

  return (
    <div className="modal-backdrop">
      <section className="editor-panel">
        <header className="editor-header">
          <h2>{mode.kind === 'new' ? 'New note' : 'Edit note'}</h2>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="editor-grid">
          <label>
            Title
            <input value={draft.title || ''} onChange={(event) => update({ title: event.target.value })} />
          </label>
          <label>
            Type
            <select
              value={draft.type || 'TEXT'}
              onChange={(event) => {
                const type = event.target.value as NoteType;
                update({
                  type,
                  checklist:
                    type === 'CHECKLIST' && !checklist.length
                      ? [{ id: crypto.randomUUID(), text: draft.body || '', checked: false, sortOrder: 0 }]
                      : checklist
                });
              }}
            >
              <option value="TEXT">Text</option>
              <option value="CHECKLIST">Checklist</option>
            </select>
          </label>
        </div>

        {draft.type === 'CHECKLIST' ? (
          <div className="checklist-editor">
            {checklist.map((item, index) => (
              <div className="check-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() =>
                    update({
                      checklist: checklist.map((entry) =>
                        entry.id === item.id ? { ...entry, checked: !entry.checked } : entry
                      )
                    })
                  }
                />
                <input
                  value={item.text}
                  onChange={(event) =>
                    update({
                      checklist: checklist.map((entry) =>
                        entry.id === item.id ? { ...entry, text: event.target.value, sortOrder: index } : entry
                      )
                    })
                  }
                />
                <button onClick={() => update({ checklist: checklist.filter((entry) => entry.id !== item.id) })}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              className="secondary"
              onClick={() =>
                update({
                  checklist: [
                    ...checklist,
                    { id: crypto.randomUUID(), text: '', checked: false, sortOrder: checklist.length }
                  ]
                })
              }
            >
              <Plus size={16} />
              Add item
            </button>
          </div>
        ) : (
          <label>
            Body
            <textarea rows={8} value={draft.body || ''} onChange={(event) => update({ body: event.target.value })} />
          </label>
        )}

        <div className="editor-grid">
          <label>
            Reminder
            <input
              type="datetime-local"
              value={toDateTimeLocal(draft.reminderAt)}
              onChange={(event) => update({ reminderAt: fromDateTimeLocal(event.target.value) })}
            />
          </label>
          <label className="attachment-upload-btn">
            Attachments ({draft.attachments?.length || 0})
            <input type="file" onChange={pickFiles} disabled={!session.token || uploading} />
          </label>
        </div>

        <div className="toggle-row">
          <label>
            <input type="checkbox" checked={Boolean(draft.pinned)} onChange={() => update({ pinned: !draft.pinned })} />
            Pinned
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(draft.archived)}
              onChange={() => update({ archived: !draft.archived })}
            />
            Archived
          </label>
          <label>
            <input
              type="checkbox"
              checked={Boolean(draft.trashed)}
              onChange={() => update({ trashed: !draft.trashed })}
            />
            Trashed
          </label>
        </div>

        <div className="swatch-row">
          {COLORS.map((color) => (
            <button
              aria-label={`Use color ${colorHex(color)}`}
              className={draft.color === color ? 'swatch selected' : 'swatch'}
              key={color}
              onClick={() => update({ color })}
              style={{ backgroundColor: colorHex(color) }}
            />
          ))}
        </div>

        <div className="label-picker">
          {labels.map((label) => {
            const selected = (draft.labels || []).includes(label.id);
            return (
              <button
                className={selected ? 'chip selected' : 'chip'}
                key={label.id}
                onClick={() =>
                  update({
                    labels: selected
                      ? (draft.labels || []).filter((id) => id !== label.id)
                      : [...(draft.labels || []), label.id]
                  })
                }
              >
                {label.name}
              </button>
            );
          })}
        </div>

        {uploadError && <p className="upload-error">{uploadError}</p>}
        {uploading && progress && (
          <div className="upload-progress-container">
            <div className="upload-progress-bar" style={{ width: `${progress.percent}%` }} />
            <div className="upload-progress-text">
              <span>{progress.percent >= 100 ? 'Processing at Mega.nz...' : `${progress.percent}% uploaded`}</span>
              <span>{progress.percent >= 100 ? '' : formatSpeed(progress.speedBps)}</span>
            </div>
          </div>
        )}

        <div className="attachment-strip">
          {(draft.attachments || []).map((attachment: AttachmentMeta) => (
            <AttachmentPreview
              key={attachment.id}
              session={session}
              attachment={attachment}
              onRemove={() =>
                update({
                  attachments: (draft.attachments || []).filter((a) => a.id !== attachment.id)
                })
              }
            />
          ))}
        </div>

        <footer className="editor-actions">
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={save} disabled={uploading}>
            <Save size={18} />
            {uploading ? 'Wait for upload...' : 'Save'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function LabelsPanel({
  labels,
  newLabel,
  setNewLabel,
  addLabel,
  renameLabel,
  removeLabel
}: {
  labels: Label[];
  newLabel: string;
  setNewLabel: (value: string) => void;
  addLabel: () => void;
  renameLabel: (label: Label, name: string) => void;
  removeLabel: (label: Label) => void;
}) {
  return (
    <section className="panel">
      <h1>Labels</h1>
      <div className="inline-form">
        <input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} placeholder="New label" />
        <button className="primary compact" onClick={addLabel}>
          <Plus size={16} />
          Add
        </button>
      </div>
      <div className="label-manager">
        {labels.map((label) => (
          <LabelRow key={label.id} label={label} renameLabel={renameLabel} removeLabel={removeLabel} />
        ))}
      </div>
    </section>
  );
}

function LabelRow({
  label,
  renameLabel,
  removeLabel
}: {
  label: Label;
  renameLabel: (label: Label, name: string) => void;
  removeLabel: (label: Label) => void;
}) {
  const [value, setValue] = useState(label.name);
  return (
    <div className="label-row-editor">
      <input value={value} onChange={(event) => setValue(event.target.value)} />
      <button onClick={() => renameLabel(label, value)}>
        <Check size={16} />
      </button>
      <button onClick={() => removeLabel(label)}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  passphrase,
  setPassphrase,
  loginUser,
  setLoginUser,
  loginPass,
  setLoginPass,
  doLogin,
  logout,
  clearCache,
  purgeTrash
}: {
  settings: WebSettings;
  setSettings: (settings: WebSettings) => void;
  passphrase: string;
  setPassphrase: (value: string) => void;
  loginUser: string;
  setLoginUser: (value: string) => void;
  loginPass: string;
  setLoginPass: (value: string) => void;
  doLogin: (event: FormEvent) => void;
  logout: () => void;
  clearCache: () => void;
  purgeTrash: () => void;
}) {
  return (
    <section className="settings-grid">
      <div className="panel">
        <h1>Settings</h1>
        <label>
          Theme
          <select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as WebSettings['theme'] })}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Default layout
          <select value={settings.layout} onChange={(event) => setSettings({ ...settings, layout: event.target.value as WebSettings['layout'] })}>
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </label>
        <label>
          Purge trash after
          <select value={settings.purgeDays} onChange={(event) => setSettings({ ...settings, purgeDays: Number(event.target.value) as 7 | 14 | 30 })}>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
        <label>
          Session passphrase
          <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
        </label>
        <div className="button-row">
          <button className="secondary" onClick={clearCache}>Clear cache</button>
          <button className="secondary" onClick={purgeTrash}>Purge trash</button>
        </div>
      </div>
      <form className="panel" onSubmit={doLogin}>
        <h1>MEGA login</h1>
        <p className="muted">Sign in with your mega.nz email and password. Your notes are stored in your own MEGA account.</p>
        <label>
          MEGA email
          <input
            type="email"
            autoComplete="username"
            value={loginUser}
            onChange={(event) => setLoginUser(event.target.value)}
          />
        </label>
        <label>
          MEGA password
          <input
            type="password"
            autoComplete="current-password"
            value={loginPass}
            onChange={(event) => setLoginPass(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="primary" type="submit">
            <LogIn size={18} />
            Login
          </button>
          <button className="secondary" type="button" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
        <p className="muted">{settings.token ? 'Token saved in browser storage.' : 'Not logged in.'}</p>
        <p className="muted">
          <Bell size={14} />
          Reminder notifications run while this browser session is open.
        </p>
      </form>
    </section>
  );
}
