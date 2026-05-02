import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, FileText, ImageIcon, Loader2 } from 'lucide-react';
import NoteCard from '@/components/notes/NoteCard';
import NoteEditor from '@/components/notes/NoteEditor';
import NoteDrawingCanvas from '@/components/notes/NoteDrawingCanvas';

export default function StudentNotes() {
  const { schoolUser: user } = useSchoolAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogMode, setDialogMode] = useState(null); // null | 'text' | 'drawing'
  const [editingNote, setEditingNote] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await base44.entities.Note.filter({ studentId: user.id, isArchived: false });
    setNotes(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveText = async ({ title, content, mode }) => {
    if (editingNote?.id) {
      await base44.entities.Note.update(editingNote.id, { title, content, mode });
    } else {
      await base44.entities.Note.create({
        schoolId: user.schoolId,
        studentId: user.id,
        studentName: user.fullName,
        title,
        content,
        mode: 'text',
      });
    }
    setDialogMode(null);
    setEditingNote(null);
    load();
  };

  const handleSaveDrawing = async (dataUrl) => {
    // Upload the PNG data URL as a file
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'drawing.png', { type: 'image/png' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const title = editingNote?.title || `Drawing ${new Date().toLocaleDateString()}`;
    if (editingNote?.id) {
      await base44.entities.Note.update(editingNote.id, { drawingUrl: file_url, mode: 'drawing' });
    } else {
      await base44.entities.Note.create({
        schoolId: user.schoolId,
        studentId: user.id,
        studentName: user.fullName,
        title,
        drawingUrl: file_url,
        mode: 'drawing',
      });
    }
    setDialogMode(null);
    setEditingNote(null);
    load();
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setDialogMode(note.mode === 'drawing' ? 'drawing' : 'text');
  };

  const handleDelete = async (note) => {
    await base44.entities.Note.update(note.id, { isArchived: true });
    load();
  };

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase())
  );

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
            <NoteCard key={note.id} note={note} onEdit={handleEdit} onDelete={handleDelete} />
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
            onCancel={() => { setDialogMode(null); setEditingNote(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Drawing Dialog */}
      <Dialog open={dialogMode === 'drawing'} onOpenChange={open => !open && setDialogMode(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Drawing' : 'New Drawing'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <NoteDrawingCanvas
              onSave={handleSaveDrawing}
              onCancel={() => { setDialogMode(null); setEditingNote(null); }}
              existingImageUrl={editingNote?.drawingUrl}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}