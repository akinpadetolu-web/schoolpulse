import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Send, Eye, FileText, Pencil, CheckCircle, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { getTerms } from '@/lib/academicTermUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportCardViewer from '@/components/school/ReportCardViewer';

export default function AdminReportCards() {
  const { schoolUser: user } = useSchoolAuth();
  const [reportCards, setReportCards] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewingCard, setViewingCard] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const [form, setForm] = useState({
    selectedClass: '',
    selectedStudents: [],
    templateId: '',
    termId: '',
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [cards, stud, cls, subj, tmpl, grd, att, termData] = await Promise.all([
      base44.entities.ReportCard.filter({ schoolId: user?.schoolId }),
      base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' }),
      base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.Subject.filter({ schoolId: user?.schoolId, isArchived: false }),
      base44.entities.ReportCardTemplate.filter({ schoolId: user?.schoolId }),
      base44.entities.Grade.filter({ schoolId: user?.schoolId }),
      base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
      getTerms(user?.schoolId),
    ]);
    setReportCards(cards || []);
    setStudents(stud || []);
    setClasses(cls || []);
    setSubjects(subj || []);
    setTemplates(tmpl || []);
    setGrades(grd || []);
    setAttendance(att || []);
    setTerms(termData || []);
    setLoading(false);
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
    if (!form.selectedClass || form.selectedStudents.length === 0 || !form.templateId || !form.termId) {
      return toast.error('All fields are required');
    }
    setGenerating(true);
    const template = templates.find(t => t.id === form.templateId);
    const selectedTerm = terms.find(t => t.id === form.termId);
    const selectedStudentObjects = students.filter(s => form.selectedStudents.includes(s.id));

    try {
      // Calculate class position for all students in the class
      const classStudentsData = selectedStudentObjects.map(student => {
        const studentGrades = grades.filter(g => {
          const gradeDate = new Date(g.created_date);
          return g.studentId === student.id && gradeDate >= new Date(selectedTerm.startDate) && gradeDate <= new Date(selectedTerm.endDate);
        });
        const subjectIds = [...new Set(studentGrades.map(g => g.subjectId))];
        const subjectGrades = subjectIds.map(subjectId => {
          const subjectGradeList = studentGrades.filter(g => g.subjectId === subjectId);
          return subjectGradeList.length > 0
            ? Math.round(subjectGradeList.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / subjectGradeList.length)
            : 0;
        });
        const overallAverage = subjectGrades.length > 0
          ? Math.round(subjectGrades.reduce((sum, sg) => sum + sg, 0) / subjectGrades.length)
          : 0;
        return { id: student.id, overallAverage };
      });

      // Sort by overall average to determine positions
      const sorted = [...classStudentsData].sort((a, b) => b.overallAverage - a.overallAverage);

      for (const student of selectedStudentObjects) {
        const termStart = new Date(selectedTerm.startDate);
        const termEnd = new Date(selectedTerm.endDate);
        const studentGrades = grades.filter(g => {
          const gradeDate = new Date(g.created_date);
          return g.studentId === student.id && gradeDate >= termStart && gradeDate <= termEnd;
        });
        const studentAttendance = attendance.filter(a => {
          const attDate = new Date(a.date);
          return a.studentId === student.id && attDate >= termStart && attDate <= termEnd;
        });

        const subjectIds = [...new Set(studentGrades.map(g => g.subjectId))];
        const subjectGrades = subjectIds.map(subjectId => {
          const subjectGradeList = studentGrades.filter(g => g.subjectId === subjectId);
          const avg = subjectGradeList.length > 0
            ? Math.round(subjectGradeList.reduce((sum, g) => sum + (g.score / g.maxScore * 100), 0) / subjectGradeList.length)
            : 0;
          const subject = subjects.find(s => s.id === subjectId);
          return {
            subjectId,
            subjectName: subject?.name || 'Unknown',
            weightedAverage: avg,
            letterGrade: getLetterGrade(avg),
          };
        });

        const overallAverage = subjectGrades.length > 0
          ? Math.round(subjectGrades.reduce((sum, sg) => sum + sg.weightedAverage, 0) / subjectGrades.length)
          : 0;
        const attendanceRate = studentAttendance.length > 0
          ? Math.round((studentAttendance.filter(a => a.status === 'present').length / studentAttendance.length) * 100)
          : 0;

        const classPosition = sorted.findIndex(s => s.id === student.id) + 1;

        const reportCard = {
          schoolId: user.schoolId,
          schoolName: user.schoolName,
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          classId: form.selectedClass,
          className: classes.find(c => c.id === form.selectedClass)?.className || '',
          classPosition,
          totalStudentsInClass: selectedStudentObjects.length,
          templateId: form.templateId,
          templateName: template.name,
          period: selectedTerm.name,
          generatedDate: new Date().toISOString().split('T')[0],
          subjectGrades,
          overallAverage,
          overallLetterGrade: getLetterGrade(overallAverage),
          attendanceRate,
          lessonCount: studentGrades.length,
          assignmentSubmissionRate: 85,
          status: 'generated',
        };

        await base44.entities.ReportCard.create(reportCard);
      }

      toast.success(`Report cards generated for ${selectedStudentObjects.length} student(s)`);
      setShowGenerate(false);
      setForm({ selectedClass: '', selectedStudents: [], templateId: '', termId: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to generate report cards');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendCard(rc) {
    await base44.entities.ReportCard.update(rc.id, { status: 'sent', sentDate: new Date().toISOString() });
    toast.success(`Report card sent to ${rc.studentName}`);
    loadData();
  }

  async function handleApprove(rc) {
    await base44.entities.ReportCard.update(rc.id, { status: 'approved', approvedBy: user.fullName, approvalDate: new Date().toISOString() });
    toast.success('Report card approved');
    loadData();
  }

  function openEdit(rc) {
    setEditingCard(rc);
    setEditForm({
      teacherComment: rc.teacherComment || '',
      principalComment: rc.principalComment || '',
      behaviorSummary: rc.behaviorSummary || '',
      lessonProgressSummary: rc.lessonProgressSummary || '',
      promotionRecommendation: rc.promotionRecommendation || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    await base44.entities.ReportCard.update(editingCard.id, editForm);
    toast.success('Report card updated');
    setSaving(false);
    setEditingCard(null);
    loadData();
  }

  async function handleDownload(cardId) {
    try {
      setDownloading(cardId);
      const response = await base44.functions.invoke('downloadReportCard', { reportCardId: cardId });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${cardId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report card downloaded');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download report card');
    } finally {
      setDownloading(null);
    }
  }

  const getTemplate = (templateId) => templates.find(t => t.id === templateId);
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{rc.overallLetterGrade || '-'}</Badge>
                      <Badge variant="outline">{rc.overallAverage ?? '-'}%</Badge>
                      {rc.classPosition && <Badge variant="outline" className="font-semibold">#{rc.classPosition}</Badge>}
                      <Badge variant={rc.status === 'sent' ? 'default' : rc.status === 'approved' ? 'secondary' : 'outline'}>
                        {rc.status}
                      </Badge>
                      {rc.promotionRecommendation && (
                        <Badge className={
                          rc.promotionRecommendation === 'promote' ? 'bg-green-100 text-green-700' :
                          rc.promotionRecommendation === 'repeat' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {rc.promotionRecommendation}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setViewingCard(rc)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(rc)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(rc.id)} disabled={downloading === rc.id}>
                      {downloading === rc.id ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    {rc.status === 'generated' && (
                      <Button variant="outline" size="sm" onClick={() => handleApprove(rc)}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {(rc.status === 'approved' || rc.status === 'generated') && (
                      <Button size="sm" onClick={() => handleSendCard(rc)}>
                        <Send className="w-4 h-4 mr-1" /> Send
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate Report Cards</DialogTitle></DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <Label className="text-sm">Class *</Label>
              <Select value={form.selectedClass} onValueChange={val => setForm({ ...form, selectedClass: val, selectedStudents: [] })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.selectedClass && (
              <div>
                <Label className="text-sm">Students *</Label>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, selectedStudents: classStudents.map(s => s.id) })}>Select All</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, selectedStudents: [] })}>Clear</Button>
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {classStudents.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => {
                        const selected = form.selectedStudents.includes(s.id)
                          ? form.selectedStudents.filter(id => id !== s.id)
                          : [...form.selectedStudents, s.id];
                        setForm({ ...form, selectedStudents: selected });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm border-b transition-colors ${form.selectedStudents.includes(s.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}
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
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Academic Term *</Label>
              <Select value={form.termId} onValueChange={val => setForm({ ...form, termId: val })}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYear})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={generating}>
              {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Generate Report Cards
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingCard} onOpenChange={() => setViewingCard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {viewingCard && <ReportCardViewer reportCard={viewingCard} template={getTemplate(viewingCard.templateId)} />}
        </DialogContent>
      </Dialog>

      {/* Edit Comments Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Report Card — {editingCard?.studentName}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label>Teacher's Comment</Label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={editForm.teacherComment}
                onChange={e => setEditForm({ ...editForm, teacherComment: e.target.value })}
                placeholder="Enter teacher's comment..."
              />
            </div>
            <div>
              <Label>Principal's Comment</Label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={editForm.principalComment}
                onChange={e => setEditForm({ ...editForm, principalComment: e.target.value })}
                placeholder="Enter principal's comment..."
              />
            </div>
            <div>
              <Label>Behavior Summary</Label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={editForm.behaviorSummary}
                onChange={e => setEditForm({ ...editForm, behaviorSummary: e.target.value })}
                placeholder="Student behavior summary..."
              />
            </div>
            <div>
              <Label>Lesson Progress Summary</Label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={editForm.lessonProgressSummary}
                onChange={e => setEditForm({ ...editForm, lessonProgressSummary: e.target.value })}
                placeholder="Lesson progress summary..."
              />
            </div>
            <div>
              <Label>Promotion Recommendation</Label>
              <Select value={editForm.promotionRecommendation} onValueChange={v => setEditForm({ ...editForm, promotionRecommendation: v })}>
                <SelectTrigger><SelectValue placeholder="Select recommendation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promote">Promote</SelectItem>
                  <SelectItem value="repeat">Repeat Year</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}