import React, { useState, useEffect, useCallback } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText, ImageIcon, Loader2, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export default function TeacherSharedNotes() {
  const { schoolUser: user } = useSchoolAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    // Fetch notes shared with this teacher
    const data = await base44.entities.Note.filter({ schoolId: user.schoolId, isShared: true, isArchived: false });
    const mine = (data || []).filter(n => n.sharedWith?.includes(user.id));
    setNotes(mine);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Shared Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Notes shared with you by students</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title or student..."
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