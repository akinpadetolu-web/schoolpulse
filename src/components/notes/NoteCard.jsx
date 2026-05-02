import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Pencil, Trash2, Share2, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function NoteCard({ note, onEdit, onDelete, onShare }) {
  const isDrawing = note.mode === 'drawing';

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1" onClick={() => onEdit(note)}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDrawing ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              {isDrawing ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{note.title}</p>
              <div className="flex items-center gap-1 flex-wrap mt-1">
                {note.subject && <Badge variant="outline" className="text-xs">{note.subject}</Badge>}
                {note.isShared && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    Shared {note.sharedWith?.length > 0 ? `(${note.sharedWith.length})` : ''}
                    {note.feedbackRequested && ' · Feedback'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {note.updated_date ? format(new Date(note.updated_date), 'MMM d, yyyy') : ''}
              </p>
              {!isDrawing && note.content && (
                <p
                  className="text-xs text-muted-foreground mt-1 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]+>/g, ' ').slice(0, 100) }}
                />
              )}
              {isDrawing && note.drawingUrl && (
                <img src={note.drawingUrl} alt="drawing preview" className="mt-2 h-16 rounded border object-contain bg-white" />
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onShare && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Share" onClick={e => { e.stopPropagation(); onShare(note); }}>
                <Share2 className="w-3 h-3" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(note)}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(note)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}