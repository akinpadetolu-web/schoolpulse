import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Share2, X, Users, MessageSquare } from 'lucide-react';

export default function NoteShareDialog({ note, open, onClose, currentUserId, schoolId }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set(note?.sharedWith || []));
  const [feedbackRequested, setFeedbackRequested] = useState(note?.feedbackRequested || false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !schoolId) return;
    setLoading(true);
    setSelected(new Set(note?.sharedWith || []));
    setFeedbackRequested(note?.feedbackRequested || false);
    setSaved(false);
    base44.entities.SchoolUser.filter({ schoolId, isArchived: false }).then(data => {
      // Show teachers and classmates (exclude self)
      const filtered = (data || []).filter(u =>
        u.id !== currentUserId &&
        (u.role === 'teacher' || (u.role === 'student' && u.classId === note?.classId))
      );
      setUsers(filtered);
      setLoading(false);
    });
  }, [open, schoolId, currentUserId, note]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const selectedUsers = users.filter(u => selected.has(u.id));
    await base44.entities.Note.update(note.id, {
      isShared: selected.size > 0,
      sharedWith: [...selected],
      sharedWithNames: selectedUsers.map(u => u.fullName),
      feedbackRequested,
    });
    setSaving(false);
    setSaved(true);
  };

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  const teachers = filteredUsers.filter(u => u.role === 'teacher');
  const classmates = filteredUsers.filter(u => u.role === 'student');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1 truncate text-muted-foreground">{note?.title}</p>
          </div>

          {/* Feedback toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg bg-muted cursor-pointer">
            <Checkbox
              checked={feedbackRequested}
              onCheckedChange={setFeedbackRequested}
            />
            <div>
              <p className="text-sm font-medium flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Request feedback</p>
              <p className="text-xs text-muted-foreground">Recipients will know you'd like their comments</p>
            </div>
          </label>

          <Input
            placeholder="Search teachers or classmates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm"
          />

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {teachers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Teachers
                  </p>
                  {teachers.map(u => (
                    <UserRow key={u.id} user={u} selected={selected.has(u.id)} onToggle={() => toggle(u.id)} />
                  ))}
                </div>
              )}
              {classmates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Classmates
                  </p>
                  {classmates.map(u => (
                    <UserRow key={u.id} user={u} selected={selected.has(u.id)} onToggle={() => toggle(u.id)} />
                  ))}
                </div>
              )}
              {teachers.length === 0 && classmates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No teachers or classmates found.</p>
              )}
            </div>
          )}

          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {[...selected].map(id => {
                const u = users.find(x => x.id === id);
                if (!u) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1 text-xs pr-1">
                    {u.fullName}
                    <button onClick={() => toggle(id)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Share2 className="w-3 h-3 mr-1" />}
              {saved ? 'Shared!' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ user, selected, onToggle }) {
  const roleColor = user.role === 'teacher' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
  return (
    <label className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted cursor-pointer">
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.fullName}</p>
        {user.className && <p className="text-xs text-muted-foreground">{user.className}</p>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor}`}>{user.role}</span>
    </label>
  );
}