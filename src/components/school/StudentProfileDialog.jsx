import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

// JS1-JS3 → General only. SS1-SS3 → Science, Art & Humanity, Commercial
const JS_LEVELS = ["JS1", "JS2", "JS3"];
const SS_SUBSETS = ["Science", "Art & Humanity", "Commercial"];

function getSubsetsForClass(cls) {
  if (!cls) return [];
  const base = (cls.baseLevel || cls.className || "").toUpperCase();
  const isJS = JS_LEVELS.some(l => base.startsWith(l));
  if (isJS) return ["General"];
  return SS_SUBSETS;
}

export default function StudentProfileDialog({ open, onOpenChange, student, classes, schoolId, onSaved }) {
  const [classId, setClassId] = useState(student?.classId || "");
  const [subsetName, setSubsetName] = useState(student?.subsetName || "");
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState(student?.assignedSubjects || []);
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find(c => c.id === classId) || null;
  const subsets = getSubsetsForClass(selectedClass);

  // Auto-set subset when class changes
  useEffect(() => {
    if (subsets.length === 1) setSubsetName(subsets[0]);
    else setSubsetName("");
  }, [classId]);

  // Load subjects applicable to selected class
  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    base44.entities.Subject.filter({ schoolId, isArchived: false }).then(all => {
      setSubjects((all || []).filter(s => (s.applicableClasses || []).includes(classId)));
    });
  }, [classId, schoolId]);

  function toggleSubject(subjectId) {
    setAssignedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  }

  async function handleSave() {
    setSaving(true);
    const cls = classes.find(c => c.id === classId);
    await base44.entities.SchoolUser.update(student.id, {
      classId: classId || "",
      className: cls?.className || "",
      baseLevel: cls?.baseLevel || "",
      educationLevel: cls?.educationLevel || "",
      academicTrack: cls?.academicTrack || "",
      subsetName: subsetName || "",
      assignedSubjects,
    });
    toast.success("Student profile updated");
    setSaving(false);
    if (onSaved) onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Student Profile — {student?.fullName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Class */}
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={v => { setClassId(v); setAssignedSubjects([]); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Subset / Track */}
          {classId && subsets.length > 0 && (
            <div className="space-y-2">
              <Label>Class Subset / Track</Label>
              {subsets.length === 1 ? (
                <div className="px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground">{subsets[0]}</div>
              ) : (
                <Select value={subsetName} onValueChange={setSubsetName}>
                  <SelectTrigger><SelectValue placeholder="Select subset" /></SelectTrigger>
                  <SelectContent>
                    {subsets.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Subjects */}
          {classId && (
            <div className="space-y-2">
              <Label>Assigned Subjects</Label>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No subjects mapped to this class yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {subjects.map(s => {
                    const active = assignedSubjects.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSubject(s.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:border-primary'
                        }`}
                      >
                        {active && <CheckCircle2 className="w-3 h-3" />}
                        {s.name}
                        {s.isCompulsory && <Badge className="ml-1 text-[10px] px-1 py-0 bg-amber-100 text-amber-700 border-0">Core</Badge>}
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedSubjects.length > 0 && (
                <p className="text-xs text-muted-foreground">{assignedSubjects.length} subject(s) selected</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !classId}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}