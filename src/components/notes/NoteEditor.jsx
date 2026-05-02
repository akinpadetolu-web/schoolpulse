import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X } from 'lucide-react';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['clean'],
  ],
};

export default function NoteEditor({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), content, mode: 'text' });
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <Input
        placeholder="Note title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="text-base font-medium"
      />
      <div className="flex-1 min-h-[300px]">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={QUILL_MODULES}
          style={{ height: '100%', minHeight: '260px' }}
        />
      </div>
      <div className="flex justify-end gap-2 mt-8">
        <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-1" />Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </div>
  );
}