import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Megaphone, Users, GraduationCap, BookOpen, UserCheck, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { createAnnouncementNotification } from '@/lib/notificationService';

const ROLES = [
  { value: "all",     label: "Everyone",        icon: Users,          desc: "All students, teachers and parents" },
  { value: "student", label: "Students",         icon: GraduationCap,  desc: "All or specific class students" },
  { value: "parent",  label: "Parents",          icon: UserCheck,      desc: "All or parents of specific classes" },
  { value: "teacher", label: "Teachers",         icon: BookOpen,       desc: "All or teachers of specific classes/subjects" },
];

function RoleCard({ role, selected, onClick }) {
  const Icon = role.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 w-full rounded-xl border p-3 text-left transition-all ${
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium text-sm">{role.label}</p>
        <p className="text-xs text-muted-foreground">{role.desc}</p>
      </div>
    </button>
  );
}

function MultiSelectList({ items, selected, onToggle, labelKey = "name" }) {
  const allSelected = items.length > 0 && items.every(i => selected.includes(i.id));

  function toggleAll() {
    if (allSelected) onToggle([]);
    else onToggle(items.map(i => i.id));
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={toggleAll}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
      >
        {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        {allSelected ? "Deselect All" : "Select All"}
      </button>
      <div className="max-h-44 overflow-y-auto divide-y">
        {items.map(item => {
          const isSelected = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(isSelected ? selected.filter(id => id !== item.id) : [...selected, item.id])}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${isSelected ? 'bg-primary/5 text-primary font-medium' : 'hover:bg-muted/40'}`}
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />}
              {item[labelKey]}
            </button>
          );
        })}
        {items.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No items available</p>}
      </div>
    </div>
  );
}

function buildAudienceLabel(targetRole, targetClassIds, targetClassNames, targetSubjectIds, targetSubjectNames) {
  if (targetRole === "all") return "Everyone";
  const roleLabel = ROLES.find(r => r.value === targetRole)?.label || targetRole;
  const parts = [];
  if (targetClassIds && targetClassIds.length > 0) {
    parts.push(`Classes: ${targetClassNames.join(", ")}`);
  } else {
    parts.push(`All ${roleLabel}`);
  }
  if (targetSubjectIds && targetSubjectIds.length > 0) {
    parts.push(`Subjects: ${targetSubjectNames.join(", ")}`);
  }
  return parts.join(" · ");
}

const EMPTY_FORM = { title: "", message: "", targetRole: "all" };

export default function AdminAnnouncements() {
  const user = getCurrentUser();
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [targetClassIds, setTargetClassIds] = useState([]);
  const [targetSubjectIds, setTargetSubjectIds] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [data, cls, subjs] = await Promise.all([
      base44.entities.Announcement.filter({ schoolId: user?.schoolId }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
    ]);
    setItems(data || []);
    setClasses(cls || []);
    setSubjects(subjs || []);
    setLoading(false);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setTargetClassIds([]);
    setTargetSubjectIds([]);
    setShowCreate(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title and message are required");
    setSaving(true);

    const targetClassNames = classes.filter(c => targetClassIds.includes(c.id)).map(c => c.className);
    const targetSubjectNames = subjects.filter(s => targetSubjectIds.includes(s.id)).map(s => s.name);
    const audienceLabel = buildAudienceLabel(form.targetRole, targetClassIds, targetClassNames, targetSubjectIds, targetSubjectNames);

    const announcement = {
      schoolId: user.schoolId,
      schoolName: user.schoolName,
      title: form.title,
      message: form.message,
      targetRole: form.targetRole,
      targetClassIds: form.targetRole !== "all" ? targetClassIds : [],
      targetClassNames: form.targetRole !== "all" ? targetClassNames : [],
      targetSubjectIds: form.targetRole === "teacher" ? targetSubjectIds : [],
      targetSubjectNames: form.targetRole === "teacher" ? targetSubjectNames : [],
      targetAudienceLabel: audienceLabel,
      authorId: user.id,
      authorName: user.fullName,
      isPublished: true,
    };

    await base44.entities.Announcement.create(announcement);
    await createAnnouncementNotification(announcement, user);

    toast.success("Announcement published and notifications sent");
    setShowCreate(false);
    loadData();
    setSaving(false);
  }

  // Sort newest first
  const sorted = [...items].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Announcement</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sorted.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    {a.targetAudienceLabel || (a.targetRole === "all" ? "Everyone" : a.targetRole)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By {a.authorName} · {a.created_date ? new Date(a.created_date).toLocaleDateString() : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <p className="text-sm text-muted-foreground">Choose your audience, then write your message.</p>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">

            {/* Title & Message */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Important Notice" required />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={4} placeholder="Write your announcement here..." />
            </div>

            {/* Audience Role */}
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(role => (
                  <RoleCard
                    key={role.value}
                    role={role}
                    selected={form.targetRole === role.value}
                    onClick={() => {
                      setForm({ ...form, targetRole: role.value });
                      setTargetClassIds([]);
                      setTargetSubjectIds([]);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Class refinement (for student, parent, teacher) */}
            {form.targetRole !== "all" && (
              <div className="space-y-2">
                <Label>
                  {form.targetRole === "parent" ? "Parents of which classes?" :
                   form.targetRole === "student" ? "Students of which classes?" :
                   "Teachers of which classes?"}
                  <span className="text-muted-foreground font-normal ml-1">(leave empty = all)</span>
                </Label>
                <MultiSelectList
                  items={classes.map(c => ({ id: c.id, name: c.className }))}
                  selected={targetClassIds}
                  onToggle={setTargetClassIds}
                />
                {targetClassIds.length > 0 && (
                  <p className="text-xs text-primary">{targetClassIds.length} class(es) selected</p>
                )}
              </div>
            )}

            {/* Subject refinement (for teachers only) */}
            {form.targetRole === "teacher" && (
              <div className="space-y-2">
                <Label>
                  Specific subjects
                  <span className="text-muted-foreground font-normal ml-1">(leave empty = all subjects)</span>
                </Label>
                <MultiSelectList
                  items={subjects.map(s => ({ id: s.id, name: s.name }))}
                  selected={targetSubjectIds}
                  onToggle={setTargetSubjectIds}
                />
                {targetSubjectIds.length > 0 && (
                  <p className="text-xs text-primary">{targetSubjectIds.length} subject(s) selected</p>
                )}
              </div>
            )}

            {/* Audience preview */}
            <div className="p-3 bg-secondary/50 rounded-lg text-sm">
              <span className="text-muted-foreground">Sending to: </span>
              <span className="font-medium">
                {buildAudienceLabel(
                  form.targetRole,
                  targetClassIds,
                  classes.filter(c => targetClassIds.includes(c.id)).map(c => c.className),
                  targetSubjectIds,
                  subjects.filter(s => targetSubjectIds.includes(s.id)).map(s => s.name)
                )}
              </span>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Publish Announcement
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}