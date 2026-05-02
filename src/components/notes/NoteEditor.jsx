import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Cloud, CloudOff, Loader2 } from 'lucide-react';

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
export default function NoteEditor({ note, onSave, onAutoSave, onCancel }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveTimer = useRef(null);
  const isNewNote = !note?.id;

  const triggerAutoSave = useCallback((newTitle, newContent) => {
    if (!newTitle.trim()) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('idle');
    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      await onAutoSave({ title: newTitle.trim(), content: newContent, mode: 'text' });
      setSaveStatus('saved');
    }, 1500);
  }, [onAutoSave]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (!isNewNote) triggerAutoSave(e.target.value, content);
  };

  const handleContentChange = (val) => {
    setContent(val);
    if (!isNewNote) triggerAutoSave(title, val);
  };

  // Save new notes on close via the explicit Save button
  const handleSaveNew = async () => {
    if (!title.trim()) return;
    setSaveStatus('saving');
    await onSave({ title: title.trim(), content, mode: 'text' });
    setSaveStatus('saved');
    clearTimeout(autoSaveTimer.current);
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
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-1" />Close</Button>
        {isNewNote && (
          <Button onClick={handleSaveNew} disabled={saveStatus === 'saving' || !title.trim()}>
            {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Create Note
          </Button>
        )}
      </div>
    </div>
  );
}