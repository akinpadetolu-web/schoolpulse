import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, BookOpen, School } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherProfileDialog({ open, onOpenChange, teacher, schoolId, onSaved }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState(teacher?.teachingAssignments || []);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setAssignments(teacher?.teachingAssignments || []);
    Promise.all([
      base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId, isArchived: false }),
    ]).then(([cls, subj]) => {
      setClasses(cls || []);
      setSubjects(subj || []);
      setLoading(false);
    });
  }, [open, schoolId, teacher]);

  function isAssigned(classId, subjectId) {
    return assignments.some(a => a.classId === classId && a.subjectId === subjectId);
  }

  function toggleAssignment(classId, subjectId) {
    setAssignments(prev => {
      const exists = prev.some(a => a.classId === classId && a.subjectId === subjectId);
      if (exists) return prev.filter(a => !(a.classId === classId && a.subjectId === subjectId));
      return [...prev, { classId, subjectId }];
    });
  }

  async function handleSave() {
    setSaving(true);
    // Derive flat arrays for assignedClasses and assignedSubjects from teachingAssignments
    const assignedClasses = [...new Set(assignments.map(a => a.classId))];
    const assignedSubjects = [...new Set(assignments.map(a => a.subjectId))];
    await base44.entities.SchoolUser.update(teacher.id, {
      teachingAssignments: assignments,
      assignedClasses,
      assignedSubjects,
    });
    toast.success("Teacher assignments updated");
    setSaving(false);
    if (onSaved) onSaved();
    onOpenChange(false);
  }

  // Group subjects by class (only subjects applicable to that class)
  const classSubjectMap = classes.map(cls => ({
    cls,
    subjects: subjects.filter(s => (s.applicableClasses || []).includes(cls.id)),
  })).filter(({ subjects }) => subjects.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="w-5 h-5 text-primary" />
            {teacher?.fullName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{teacher?.email || teacher?.username}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5 pt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/40 rounded-lg px-3 py-2">
              <BookOpen className="w-4 h-4" />
              Click a subject under a class to assign/unassign the teacher to that subject for that class.
            </div>

            {assignments.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{assignments.length}</span> assignment(s) selected
              </div>
            )}

            {classSubjectMap.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No classes or subjects found. Add classes and subjects first.</p>
            ) : (
              <div className="space-y-4">
                {classSubjectMap.map(({ cls, subjects: clsSubjects }) => (
                  <div key={cls.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      {cls.className}
                      {cls.educationLevel && (
                        <Badge variant="secondary" className="text-[10px]">{cls.educationLevel}</Badge>
                      )}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {clsSubjects.map(subj => {
                        const active = isAssigned(cls.id, subj.id);
                        return (
                          <button
                            key={subj.id}
                            onClick={() => toggleAssignment(cls.id, subj.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-border hover:border-primary'
                            }`}
                          >
                            {active && <CheckCircle2 className="w-3 h-3" />}
                            {subj.name}
                            {subj.isCompulsory && (
                              <Badge className="ml-1 text-[10px] px-1 py-0 bg-amber-100 text-amber-700 border-0">Core</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Assignments
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}