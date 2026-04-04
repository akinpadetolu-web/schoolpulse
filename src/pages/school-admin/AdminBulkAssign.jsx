import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getSubjectsForClass, getSubjectsForClassAndCategory } from '@/lib/schoolData';

export default function AdminBulkAssign() {
  const user = getCurrentUser();
  const schoolId = user?.schoolId;
  const [classes, setClasses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [c, cat, s] = await Promise.all([
        base44.entities.SchoolClass.filter({ schoolId, isArchived: false }),
        base44.entities.SubjectCategory.filter({ schoolId, isArchived: false }),
        base44.entities.SchoolUser.filter({ schoolId, role: "student", isArchived: false }),
      ]);
      setClasses(c || []);
      setCategories(cat || []);
      setStudents(s || []);
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedClass) { setClassSubjects([]); return; }
    setLoadingSubjects(true);
    async function fetchSubjects() {
      const subs = selectedCategory && selectedCategory !== "all"
        ? await getSubjectsForClassAndCategory(selectedClass, selectedCategory, schoolId)
        : await getSubjectsForClass(selectedClass, schoolId);
      setClassSubjects(subs);
      setLoadingSubjects(false);
    }
    fetchSubjects();
  }, [selectedClass, selectedCategory]);

  const studentsInClass = students.filter(s => s.classId === selectedClass);

  async function handleBulkAssign() {
    if (!selectedClass) return toast.error("Please select a class");
    if (classSubjects.length === 0) return toast.error("No subjects found for this class. Assign subjects to the class first.");
    if (studentsInClass.length === 0) return toast.error("No students found in this class");
    setAssigning(true);
    setResult(null);
    try {
      const cls = classes.find(c => c.id === selectedClass);
      const subjectIds = classSubjects.map(s => s.id);
      let updated = 0;
      await Promise.all(studentsInClass.map(async student => {
        const existing = student.assignedSubjects || [];
        const newSubs = [...new Set([...existing, ...subjectIds])];
        if (newSubs.length !== existing.length) {
          await base44.entities.SchoolUser.update(student.id, { assignedSubjects: newSubs });
          updated++;
        }
      }));
      setResult({ students: studentsInClass.length, subjects: classSubjects.length, updated, className: cls?.className });
      toast.success(`Bulk assignment complete for ${cls?.className}`);
    } catch (err) { toast.error("Assignment failed"); console.error(err); }
    setAssigning(false);
  }

  async function handleCloneSubjectMapping() {
    // Clone subject mappings from one class to another
    toast.info("Select source and target class, then click Clone");
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bulk Subject Assignment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Assign subjects to all students in a class at once</p>
      </div>

      <div className="grid gap-4 max-w-xl">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Select Class *</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setResult(null); }}>
                <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Category <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects for this class</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedClass && (
              <div className="p-3 bg-secondary/50 rounded-lg space-y-2 text-sm">
                {loadingSubjects ? (
                  <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading subjects...</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subjects to assign:</span>
                      <span className="font-semibold">{classSubjects.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Students in class:</span>
                      <span className="font-semibold">{studentsInClass.length}</span>
                    </div>
                    {classSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {classSubjects.map(s => (
                          <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                        ))}
                      </div>
                    )}
                    {classSubjects.length === 0 && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No subjects mapped to this class. Go to Subjects to assign them.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleBulkAssign} disabled={assigning || !selectedClass || classSubjects.length === 0}>
              {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {assigning ? "Assigning..." : "Bulk Assign Subjects"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-0 shadow-sm bg-emerald-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-emerald-700 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Assignment Complete — {result.className}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-700">{result.students}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-700">{result.subjects}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-2xl font-bold text-emerald-700">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}