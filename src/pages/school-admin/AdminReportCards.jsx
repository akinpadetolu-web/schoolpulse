import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Download, Send, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminReportCards() {
  const user = getCurrentUser();
  const [reportCards, setReportCards] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    selectedClass: '',
    selectedStudents: [],
    templateId: '',
    period: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cards, stud, cls, subj, tmpl, grd, att] = await Promise.all([
      base44.entities.ReportCard.filter({ schoolId: user?.schoolId }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.ReportCardTemplate.filter({ schoolId: user?.schoolId }),
      base44.entities.Grade.filter({ schoolId: user?.schoolId }),
      base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
    ]);
    setReportCards(cards || []);
    setStudents(stud || []);
    setClasses(cls || []);
    setSubjects(subj || []);
    setTemplates(tmpl || []);
    setGrades(grd || []);
    setAttendance(att || []);
    setLoading(false);
  }

  async function calculateWeightedGrade(studentId, subjectId) {
    const studentGrades = grades.filter(g => g.studentId === studentId && g.subjectId === subjectId);
    const categories = await base44.entities.GradeCategory.filter({
      schoolId: user?.schoolId,
      subjectId,
    });

    if (categories.length === 0) {
      // No weighting configured, return simple average
      const avg = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / studentGrades.length
        : 0;
      return Math.round(avg);
    }

    const categoryAverages = {};
    categories.forEach(cat => {
      const catGrades = studentGrades.filter(g => {
        // Match grade to category (simplified - you might need to add category tracking in Grade entity)
        return true;
      });
      const avg = catGrades.length > 0
        ? catGrades.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / catGrades.length
        : 0;
      categoryAverages[cat.categoryName] = avg;
    });

    let weighted = 0;
    categories.forEach(cat => {
      weighted += (categoryAverages[cat.categoryName] || 0) * (cat.weight / 100);
    });
    return Math.round(weighted);
  }

  function getLetterGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.selectedClass || form.selectedStudents.length === 0 || !form.templateId || !form.period) {
      return toast.error('All fields are required');
    }

    setGenerating(true);
    const template = templates.find(t => t.id === form.templateId);
    const selectedStudentObjects = students.filter(s => form.selectedStudents.includes(s.id));

    try {
      for (const student of selectedStudentObjects) {
        const studentGrades = grades.filter(g => g.studentId === student.id);
        const studentAttendance = attendance.filter(a => a.studentId === student.id);

        const subjectIds = [...new Set(studentGrades.map(g => g.subjectId))];
        const subjectGrades = [];

        for (const subjectId of subjectIds) {
          const weighted = await calculateWeightedGrade(student.id, subjectId);
          const subject = subjects.find(s => s.id === subjectId);
          subjectGrades.push({
            subjectId,
            subjectName: subject?.name || 'Unknown',
            weightedAverage: weighted,
            letterGrade: getLetterGrade(weighted),
          });
        }

        const overallAverage = subjectGrades.length > 0
          ? Math.round(subjectGrades.reduce((sum, sg) => sum + sg.weightedAverage, 0) / subjectGrades.length)
          : 0;

        const attendanceRate = studentAttendance.length > 0
          ? Math.round((studentAttendance.filter(a => a.status === 'present').length / studentAttendance.length) * 100)
          : 0;

        const reportCard = {
          schoolId: user.schoolId,
          schoolName: user.schoolName,
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          classId: form.selectedClass,
          className: classes.find(c => c.id === form.selectedClass)?.className || '',
          templateId: form.templateId,
          templateName: template.name,
          period: form.period,
          generatedDate: new Date().toISOString().split('T')[0],
          subjectGrades,
          overallAverage,
          overallLetterGrade: getLetterGrade(overallAverage),
          attendanceRate,
          lessonCount: studentGrades.length,
          assignmentSubmissionRate: 85, // Placeholder
          status: 'generated',
        };

        await base44.entities.ReportCard.create(reportCard);
      }

      toast.success(`Report cards generated for ${selectedStudentObjects.length} student(s)`);
      setShowGenerate(false);
      setForm({ selectedClass: '', selectedStudents: [], templateId: '', period: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to generate report cards');
    } finally {
      setGenerating(false);
    }
  }

  const classStudents = students.filter(s => s.classId === form.selectedClass);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const sorted = [...reportCards].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Report Cards</h1>
        <Button onClick={() => setShowGenerate(true)}><Plus className="w-4 h-4 mr-2" /> Generate Reports</Button>
      </div>

      {sorted.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No report cards yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sorted.map(rc => (
            <Card key={rc.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{rc.studentName}</h3>
                    <p className="text-sm text-muted-foreground">{rc.className} • {rc.period}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{rc.overallLetterGrade}</Badge>
                      <Badge variant="outline">{rc.overallAverage}%</Badge>
                      <Badge variant={rc.status === 'sent' ? 'default' : 'secondary'}>{rc.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4" /></Button>
                    {rc.status !== 'sent' && <Button size="sm"><Send className="w-4 h-4" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Report Cards</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <Label className="text-sm">Class *</Label>
              <Select value={form.selectedClass} onValueChange={val => setForm({ ...form, selectedClass: val, selectedStudents: [] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.selectedClass && (
              <div>
                <Label className="text-sm">Students *</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {classStudents.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const selected = form.selectedStudents.includes(s.id)
                          ? form.selectedStudents.filter(id => id !== s.id)
                          : [...form.selectedStudents, s.id];
                        setForm({ ...form, selectedStudents: selected });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm border-b transition-colors ${
                        form.selectedStudents.includes(s.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                      }`}
                    >
                      {s.fullName}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{form.selectedStudents.length} selected</p>
              </div>
            )}

            <div>
              <Label className="text-sm">Report Template *</Label>
              <Select value={form.templateId} onValueChange={val => setForm({ ...form, templateId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Period *</Label>
              <Input
                value={form.period}
                onChange={e => setForm({ ...form, period: e.target.value })}
                placeholder="e.g. Term 1 2026, Midterm 2026"
              />
            </div>

            <Button type="submit" className="w-full" disabled={generating}>
              {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Generate Report Cards
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}