import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, ImageIcon, Loader2, MessageSquare, Users, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import JSZip from 'jszip';

export default function TeacherSharedNotes() {
  const { schoolUser: user } = useSchoolAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await base44.entities.Note.filter({ schoolId: user.schoolId, isShared: true, isArchived: false });
    const mine = (data || []).filter(n => n.sharedWith?.includes(user.id));
    setNotes(mine);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const subjects = [...new Set(notes.map(n => n.subject).filter(Boolean))].sort();

  const filtered = notes.filter(n => {
    const matchSearch = n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.studentName?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = !filterSubject || n.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const handleDownloadZip = async () => {
    const toZip = filterSubject ? notes.filter(n => n.subject === filterSubject) : notes;
    if (!toZip.length) return;
    setZipping(true);
    const zip = new JSZip();
    const subjectLabel = filterSubject || 'All_Subjects';

    for (const note of toZip) {
      const studentFolder = (note.studentName || 'Unknown').replace(/[^a-z0-9_\- ]/gi, '_');
      if (note.mode === 'drawing' && note.drawingUrl) {
        try {
          const res = await fetch(note.drawingUrl);
          const blob = await res.blob();
          zip.file(`${subjectLabel}/${studentFolder}/${note.title || 'drawing'}.png`, blob);
        } catch {/* skip failed fetch */}
      } else if (note.content) {
        const plainText = note.content
          .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        zip.file(`${subjectLabel}/${studentFolder}/${note.title || 'note'}.txt`, plainText);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${subjectLabel}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setZipping(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Shared Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Notes shared with you by students</p>
        </div>
        <Button onClick={handleDownloadZip} disabled={zipping || notes.length === 0} variant="outline" className="gap-2">
          {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download ZIP {filterSubject ? `(${filterSubject})` : '(All)'}
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {subjects.length > 0 && (
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users className="w-12 h-12 opacity-20" />
          <p className="text-sm">{search ? 'No notes match your search.' : 'No notes have been shared with you yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(note => (
            <SharedNoteCard key={note.id} note={note} onView={setViewing} />
          ))}
        </div>
      )}

      {/* View note dialog */}
      <Dialog open={!!viewing} onOpenChange={v => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{viewing.studentName}</Badge>
                {viewing.feedbackRequested && (
                  <Badge className="gap-1 bg-amber-100 text-amber-700 border-0">
                    <MessageSquare className="w-3 h-3" /> Feedback requested
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {viewing.updated_date ? format(new Date(viewing.updated_date), 'MMM d, yyyy') : ''}
                </span>
              </div>
              {viewing.mode === 'drawing' && viewing.drawingUrl ? (
                <img src={viewing.drawingUrl} alt="drawing" className="w-full rounded-lg border bg-white" />
              ) : (
                <div
                  className="prose prose-sm max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: viewing.content || '<p class="text-muted-foreground italic">No content</p>' }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SharedNoteCard({ note, onView }) {
  const isDrawing = note.mode === 'drawing';
  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(note)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDrawing ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
            {isDrawing ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{note.title}</p>
            <p className="text-xs text-muted-foreground">{note.studentName}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {note.feedbackRequested && (
                <Badge className="text-xs gap-1 bg-amber-100 text-amber-700 border-0">
                  <MessageSquare className="w-3 h-3" /> Feedback needed
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {note.updated_date ? format(new Date(note.updated_date), 'MMM d') : ''}
              </span>
            </div>
            {isDrawing && note.drawingUrl && (
              <img src={note.drawingUrl} alt="preview" className="mt-2 h-16 rounded border object-contain bg-white" />
            )}
            {!isDrawing && note.content && (
              <p
                className="text-xs text-muted-foreground mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]+>/g, ' ').slice(0, 100) }}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}