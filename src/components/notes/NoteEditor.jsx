import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Cloud, CloudOff, Loader2, Share2, Download } from 'lucide-react';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

// Auto-save status: 'idle' | 'saving' | 'saved' | 'error'
async function downloadTextAsPdf(note, title, content) {
  const { jsPDF } = await import('jspdf').then(m => m);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const maxW = pageW - margin * 2;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Note', margin, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.setTextColor(0);
  const plainText = (content || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(plainText, maxW);
  doc.text(lines, margin, 100);
  doc.save(`${title || 'note'}.pdf`);
}

export default function NoteEditor({ note, onSave, onAutoSave, onCancel, onShare }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveTimer = useRef(null);
  // Track the created note id for new notes after first save
  const noteIdRef = useRef(note?.id || null);
  const [downloading, setDownloading] = useState(false);

  const triggerAutoSave = useCallback((newTitle, newContent) => {
    const trimmedTitle = newTitle.trim() || 'Untitled Note';
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('idle');
    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        if (noteIdRef.current) {
          // Existing note — update in place
          await onAutoSave({ id: noteIdRef.current, title: trimmedTitle, content: newContent });
        } else {
          // New note — create it for the first time, then keep updating
          const created = await onSave({ title: trimmedTitle, content: newContent, mode: 'text' });
          if (created?.id) noteIdRef.current = created.id;
        }
        setSaveStatus('saved');
      } catch (e) {
        console.error('Note save failed:', e);
        setSaveStatus('error');
      }
    }, 1500);
  }, [onSave, onAutoSave]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    triggerAutoSave(e.target.value, content);
  };

  const handleContentChange = (val) => {
    setContent(val);
    triggerAutoSave(title, val);
  };

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const StatusIcon = () => {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-xs text-emerald-600"><Cloud className="w-3 h-3" /> Saved</span>;
    if (saveStatus === 'error') return <span className="flex items-center gap-1 text-xs text-destructive"><CloudOff className="w-3 h-3" /> Save failed</span>;
    return null;
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Note title..."
          value={title}
          onChange={handleTitleChange}
          className="text-base font-medium flex-1"
        />
        <StatusIcon />
      </div>
      <div className="flex-1 min-h-[300px]">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={handleContentChange}
          modules={QUILL_MODULES}
          style={{ height: '100%', minHeight: '260px' }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 mt-8 flex-wrap">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              await downloadTextAsPdf(note, title, content);
              setDownloading(false);
            }}
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
            Download PDF
          </Button>
          {onShare && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (noteIdRef.current) onShare();
                else console.warn('Cannot share: note not yet saved');
              }} 
              disabled={!noteIdRef.current}
            >
              <Share2 className="w-4 h-4 mr-1" /> Share with Teacher
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}><X className="w-4 h-4 mr-1" />Close</Button>
      </div>
    </div>
  );
}