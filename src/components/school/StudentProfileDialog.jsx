import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import StudentGradeHistory from './StudentGradeHistory';

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
  const [fullName, setFullName] = useState(student?.fullName || "");
  const [email, setEmail] = useState(student?.email || "");
  const [phone, setPhone] = useState(student?.phone || "");
  const [classId, setClassId] = useState(student?.classId || "");
  const [subsetName, setSubsetName] = useState(student?.subsetName || "");
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState(student?.assignedSubjects || []);
  const [saving, setSaving] = useState(false);
  const [linkCode, setLinkCode] = useState(student?.parentLinkCode || "");
  const [generatingCode, setGeneratingCode] = useState(false);

  const selectedClass = classes.find(c => c.id === classId) || null;
  const subsets = getSubsetsForClass(selectedClass);

  // Sync state when student changes
  useEffect(() => {
    setFullName(student?.fullName || "");
    setEmail(student?.email || "");
    setPhone(student?.phone || "");
    setClassId(student?.classId || "");
    setSubsetName(student?.subsetName || "");
    setAssignedSubjects(student?.assignedSubjects || []);
    setLinkCode(student?.parentLinkCode || "");
  }, [student?.id]);

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

  async function generateLinkCode() {
    setGeneratingCode(true);
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase() +
                    Math.random().toString(36).substring(2, 6).toUpperCase();
    await base44.entities.SchoolUser.update(student.id, { parentLinkCode: newCode });
    setLinkCode(newCode);
    toast.success("Link code generated");
    setGeneratingCode(false);
    if (onSaved) onSaved();
  }

  function copyCode() {
    navigator.clipboard.writeText(linkCode);
    toast.success("Code copied!");
  }

  async function handleSave() {
    if (!fullName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const cls = classes.find(c => c.id === classId);
    await base44.entities.SchoolUser.update(student.id, {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <p className="text-sm text-muted-foreground">{student?.username}</p>
        </DialogHeader>

        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile & Subjects</TabsTrigger>
            <TabsTrigger value="grades" className="flex-1">Grade History</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-5 pt-2">
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Student full name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" />
              </div>
            </div>
            
            {/* Phone Number */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>

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

            {/* Parent Link Code */}
            <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
              <Label>Parent Link Code</Label>
              {linkCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-md border bg-background font-mono tracking-widest text-sm font-semibold">
                    {linkCode}
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={generateLinkCode} disabled={generatingCode}>
                    {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={generateLinkCode} disabled={generatingCode}>
                  {generatingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Generate Link Code
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Share this code with the parent to link their account to this student.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !classId}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Profile
              </Button>
            </div>
          </TabsContent>

          {/* Grade History Tab */}
          <TabsContent value="grades" className="pt-2">
            <StudentGradeHistory studentId={student?.id} schoolId={schoolId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}