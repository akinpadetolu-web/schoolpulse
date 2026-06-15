import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, FileText, ImageIcon, Loader2, Tag } from 'lucide-react';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditor from '@/components/notes/NoteEditor';
import NoteDrawingCanvas from '@/components/notes/NoteDrawingCanvas';
import NoteShareDialog from '@/components/notes/NoteShareDialog';

export default function StudentNotes() {
  const { schoolUser: user } = useSchoolAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Dialog state
  const [dialogMode, setDialogMode] = useState(null); // null | 'text' | 'drawing'
  const [editingNote, setEditingNote] = useState(null);
  const [sharingNote, setSharingNote] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await base44.entities.Note.filter({ studentId: user.id, isArchived: false });
    setNotes(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: update notes in-place when teacher sends feedback
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Note.subscribe((event) => {
      if (event.type === 'update' && event.data?.studentId === user.id) {
        setNotes(prev => prev.map(n => n.id === event.id ? { ...n, ...event.data } : n));
      }
    });
    return unsub;
  }, [user?.id]);

  // Create a new note (called by NoteEditor on first auto-save of a new note)
  const handleSaveText = async ({ title, content, subject, mode }) => {
    const created = await base44.entities.Note.create({
      schoolId: user.schoolId,
      studentId: user.id,
      studentName: user.fullName,
      title,
      content,
      subject: subject || '',
      mode: 'text',
    });
    load();
    return created; // Return so NoteEditor can track the id
  };

  // Auto-save for EXISTING notes (debounced from NoteEditor)
  const handleAutoSaveText = async ({ id, title, content, subject }) => {
    if (!id) return;
    await base44.entities.Note.update(id, { title, content, subject });
    load();
  };

  // Stable ref so the drawing canvas callback doesn't go stale
  const editingNoteRef = React.useRef(editingNote);
  React.useEffect(() => { editingNoteRef.current = editingNote; }, [editingNote]);

  // Share from within editor — open the share dialog for the current note
  const handleShareFromEditor = async () => {
    const current = editingNoteRef.current;
    if (current?.id) {
      setSharingNote(current);
    } else {
      console.warn('Cannot share: note not yet saved');
    }
  };

  const handleSaveDrawing = useCallback(async (dataUrl) => {
    try {
      // Upload the PNG data URL as a file
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'drawing.png', { type: 'image/png' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const current = editingNoteRef.current;
      const title = current?.title || `Drawing ${new Date().toLocaleDateString()}`;
      const description = current?.description || '';
      if (current?.id) {
        await base44.entities.Note.update(current.id, { drawingUrl: file_url, mode: 'drawing', description });
      } else {
        const created = await base44.entities.Note.create({
          schoolId: user.schoolId,
          studentId: user.id,
          studentName: user.fullName,
          title,
          drawingUrl: file_url,
          mode: 'drawing',
          description,
        });
        // Update ref so subsequent auto-saves update the same record
        editingNoteRef.current = created;
      }
      load();
    } catch (error) {
      console.error('Drawing save error:', error);
    }
  }, [user, load]);

  const handleEdit = (note) => {
    setEditingNote(note);
    editingNoteRef.current = note; // sync ref immediately so drawing saves update correct record
    setDialogMode(note.mode === 'drawing' ? 'drawing' : 'text');
  };

  const handleDelete = async (note) => {
    await base44.entities.Note.update(note.id, { isArchived: true });
    load();
  };

  // Collect unique tags across all notes
  const allTags = [...new Set(notes.map(n => n.subject).filter(Boolean))].sort();

  const filtered = notes.filter(n => {
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || n.subject === filterTag;
    return matchSearch && matchTag;
  });

  return (
    <div className="p-4 md:p-6 space-y-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">My Notes</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setEditingNote(null); setDialogMode('drawing'); }}
          >
            <ImageIcon className="w-4 h-4 mr-1" /> New Drawing
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingNote(null); setDialogMode('text'); }}
          >
            <Plus className="w-4 h-4 mr-1" /> New Note
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => setFilterTag('')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterTag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterTag === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <FileText className="w-12 h-12 opacity-20" />
          <p className="text-sm">{search ? 'No notes match your search.' : 'No notes yet. Create your first note!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} onShare={setSharingNote} />
          ))}
        </div>
      )}

      {/* Text Note Dialog */}
      <Dialog open={dialogMode === 'text'} onOpenChange={open => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
          </DialogHeader>
          <NoteEditor
            note={editingNote}
            onSave={handleSaveText}
            onAutoSave={handleAutoSaveText}
            onCancel={() => { setDialogMode(null); setEditingNote(null); load(); }}
            onShare={handleShareFromEditor}
          />
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <NoteShareDialog
        note={sharingNote}
        open={!!sharingNote}
        onClose={() => { setSharingNote(null); load(); }}
        currentUserId={user?.id}
        schoolId={user?.schoolId}
      />

      {/* Drawing Dialog */}
      <Dialog open={dialogMode === 'drawing'} onOpenChange={open => {
        if (!open) {
          setDialogMode(null);
          setEditingNote(null);
          editingNoteRef.current = null;
          load();
        }
      }}>
        <DialogContent className="max-w-3xl h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingNote ? 'Edit Drawing' : 'New Drawing'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <NoteDrawingCanvas
              onSave={handleSaveDrawing}
              onCancel={() => { setDialogMode(null); setEditingNote(null); editingNoteRef.current = null; load(); }}
              existingImageUrl={editingNote?.drawingUrl}
              onShare={handleShareFromEditor}
              isSaved={!!editingNoteRef.current?.id}
              initialSubject={editingNote?.subject || ''}
              initialDescription={editingNote?.description || ''}
              onSubjectChange={async (val) => {
                if (editingNoteRef.current?.id) {
                  await base44.entities.Note.update(editingNoteRef.current.id, { subject: val });
                }
              }}
              onDescriptionChange={async (val) => {
                if (editingNoteRef.current?.id) {
                  await base44.entities.Note.update(editingNoteRef.current.id, { description: val });
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}