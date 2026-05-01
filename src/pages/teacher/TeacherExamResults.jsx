import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle2, AlertCircle, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TeacherExamResults() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [examForm, setExamForm] = useState({ examName: '', examTerm: '' });

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    try {
      // Get teacher's classes and subjects from teaching assignments
      const classIds = [...new Set((user?.teachingAssignments || []).map(t => t.classId).filter(Boolean))];
      const subjectIds = [...new Set((user?.teachingAssignments || []).map(t => t.subjectId).filter(Boolean))];

      const [allClasses, allSubjects, examResults] = await Promise.all([
        base44.entities.SchoolClass.filter({ schoolId: user?.schoolId }),
        base44.entities.Subject.filter({ schoolId: user?.schoolId }),
        base44.entities.ExamResult.filter({ schoolId: user?.schoolId, uploadedBy: user?.email })
      ]);

      const teacherClasses = (allClasses || []).filter(c => classIds.includes(c.id));
      const teacherSubjects = (allSubjects || []).filter(s => subjectIds.includes(s.id));
      
      setClasses(teacherClasses);
      setSubjects(teacherSubjects);
      setExams(examResults || []);

      if (teacherClasses.length > 0) setSelectedClass(teacherClasses[0].id);
      if (teacherSubjects.length > 0) setSelectedSubject(teacherSubjects[0].id);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i]; });
      return obj;
    });
    return rows;
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      // Validate required columns
      const requiredCols = ['student_name', 'student_email', 'score'];
      const hasCols = requiredCols.every(col => 
        rows[0].hasOwnProperty(col.toLowerCase()) || rows[0].hasOwnProperty(col)
      );

      if (!hasCols) {
        toast.error(`CSV must have columns: ${requiredCols.join(', ')}`);
        return;
      }

      setCsvFile(file);
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!csvFile || !examForm.examName || !selectedClass || !selectedSubject) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const text = await csvFile.text();
      const rows = parseCSV(text);

      // Get class and subject names
      const classObj = classes.find(c => c.id === selectedClass);
      const subjectObj = subjects.find(s => s.id === selectedSubject);

      // Get all students in class
      const classStudents = await base44.entities.SchoolUser.filter({
        schoolId: user?.schoolId,
        classId: selectedClass,
        role: 'student',
        isArchived: false
      });

      const resultsToCreate = [];

      for (const row of rows) {
        const studentEmail = row.student_email || row['student email'];
        const studentName = row.student_name || row['student name'];
        const score = parseFloat(row.score);

        if (!studentEmail || isNaN(score)) continue;

        // Find student by email
        const student = classStudents.find(s => s.email === studentEmail);
        if (!student) continue;

        // Calculate grade based on score
        let grade = 'F';
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';
        else if (score >= 50) grade = 'E';

        resultsToCreate.push({
          schoolId: user?.schoolId,
          examName: examForm.examName.trim(),
          examTerm: examForm.examTerm || 'Term 1',
          classId: selectedClass,
          className: classObj?.className || '',
          subjectId: selectedSubject,
          subjectName: subjectObj?.name || '',
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          score,
          maxScore: 100,
          grade,
          comments: row.comments || '',
          uploadedBy: user?.email,
          uploadedAt: new Date().toISOString()
        });
      }

      if (resultsToCreate.length === 0) {
        toast.error('No valid student records found in CSV');
        setUploading(false);
        return;
      }

      // Bulk create exam results
      await base44.entities.ExamResult.bulkCreate(resultsToCreate);

      toast.success(`Uploaded ${resultsToCreate.length} exam results`);
      setShowUploadDialog(false);
      setCsvFile(null);
      setCsvPreview([]);
      setExamForm({ examName: '', examTerm: '' });
      loadData();
    } catch (error) {
      console.error('Failed to upload results:', error);
      toast.error('Failed to upload results');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(exam) {
    if (!window.confirm(`Delete exam results for ${exam.examName}?`)) return;
    await base44.entities.ExamResult.delete(exam.id);
    toast.success('Exam results deleted');
    loadData();
  }

  function downloadTemplate() {
    const headers = ['student_name', 'student_email', 'score', 'comments'];
    const templateData = [headers.join(',')];
    const csv = templateData.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam-results-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredExams = exams.filter(e => 
    (!selectedClass || e.classId === selectedClass) &&
    (!selectedSubject || e.subjectId === selectedSubject)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">Upload and manage student exam scores</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="w-4 h-4 mr-2" /> Upload Results
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1">Filter by Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1">Filter by Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All subjects</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredExams.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>No exam results uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          filteredExams.map(exam => (
            <Card key={exam.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <CardTitle className="text-base">{exam.examName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {exam.className} • {exam.subjectName} • {exam.examTerm}
                    </p>
                  </div>
                  <Badge variant="secondary">{exam.score}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Student</p>
                    <p className="font-medium">{exam.studentName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grade</p>
                    <p className="font-medium">{exam.grade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium text-xs">{format(new Date(exam.uploadedAt), 'MMM d')}</p>
                  </div>
                </div>
                {exam.comments && (
                  <div className="text-sm p-2 bg-muted rounded">
                    <p className="text-muted-foreground text-xs mb-1">Comments</p>
                    <p>{exam.comments}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(exam)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Exam Results</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Exam Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Exam Name *</Label>
                <Input
                  placeholder="e.g. Midterm, Final Exam"
                  value={examForm.examName}
                  onChange={e => setExamForm({ ...examForm, examName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Academic Term</Label>
                <Select value={examForm.examTerm} onValueChange={v => setExamForm({ ...examForm, examTerm: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CSV Upload */}
            <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-2">
              <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Upload CSV File</p>
              <p className="text-xs text-muted-foreground">student_name, student_email, score, comments</p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                <Download className="w-3.5 h-3.5 mr-1" /> Download Template
              </Button>
            </div>

            {/* Preview */}
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Preview (first 5 rows)</p>
                <div className="bg-muted rounded p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                  {csvPreview.map((row, idx) => (
                    <div key={idx} className="flex gap-2 border-b pb-1 text-muted-foreground">
                      <span className="flex-1 truncate">{row.student_name || row['student name']}</span>
                      <span className="font-mono">{parseFloat(row.score || 0).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || !csvFile}
              className="w-full"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Results'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}