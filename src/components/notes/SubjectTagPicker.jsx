import React, { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

const PRESET_TAGS = [
  'Math', 'English', 'Science', 'History', 'Geography',
  'Physics', 'Chemistry', 'Biology', 'Literature', 'Art',
  'Music', 'Economics', 'Civic Education', 'Agricultural Science',
];

export default function SubjectTagPicker({ value, onChange }) {
  const [showInput, setShowInput] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const handleSelect = (tag) => {
    onChange(value === tag ? '' : tag);
    setShowInput(false);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setCustomInput('');
      setShowInput(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      {value ? (
        <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
          {value}
          <button onClick={() => onChange('')} className="hover:text-destructive ml-0.5">
            <X className="w-3 h-3" />
          </button>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">No tag</span>
      )}

      {!value && !showInput && (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/40 rounded-full px-2 py-0.5"
        >
          <Plus className="w-3 h-3" /> Add tag
        </button>
      )}

      {showInput && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {PRESET_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => handleSelect(tag)}
                className="px-2.5 py-0.5 rounded-full text-xs bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <Input
              autoFocus
              placeholder="Custom tag..."
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              className="h-7 text-xs"
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setCustomInput(''); }}
              className="text-xs px-2 py-1 border rounded-md"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}