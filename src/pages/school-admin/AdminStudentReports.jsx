import React, { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2, FileText, Download, Send, RefreshCw,
  CheckCircle2, Clock, Users, BarChart3, BookOpen, ClipboardList
} from 'lucide-react';
import { format, eachDayOfInterval, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function AdminStudentReports() {
  const user = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [commentDialog, setCommentDialog] = useState(null);
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => { loadClasses(); }, []);
  useEffect(() => { if (!loading) loadReports(); }, [dateRange, selectedClassId]);

  async function loadClasses() {
    const cls = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId, isArchived: false });
    setClasses(cls || []);
    setLoading(false);
  }

  async function loadReports() {
    const reps = await base44.entities.StudentReport.filter({ schoolId: user?.schoolId });
    const filtered = (reps || []).filter(r => {
      const reportDate = r.month || r.created_date?.split('T')[0];
      const inRange = reportDate >= dateRange.startDate && reportDate <= dateRange.endDate;
      const inClass = selectedClassId === 'all' || r.classId === selectedClassId;
      return inRange && inClass;
    });
    setReports(filtered);
  }

  // ── Generate reports for all students in selected date range/class ──
  async function generateReports() {
    setGenerating(true);
    try {
      const rangeStart = new Date(dateRange.startDate);
      const rangeEnd = new Date(dateRange.endDate);
      const schoolDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).filter(d => !isWeekend(d)).length;
      const rangeLabel = `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d, yyyy')}`;

      // Fetch all data in parallel
      const studentFilter = { schoolId: user?.schoolId, role: 'student', isArchived: false };
      if (selectedClassId !== 'all') studentFilter.classId = selectedClassId;

      const [students, attendance, lessonPlans, assignments, submissions] = await Promise.all([
        base44.entities.SchoolUser.filter(studentFilter),
        base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
        base44.entities.LessonPlan.filter({ schoolId: user?.schoolId, isPublished: true }),
        base44.entities.Assignment.filter({ schoolId: user?.schoolId }),
        base44.entities.Submission.filter({ schoolId: user?.schoolId }),
      ]);

      // Filter to the selected date range
      const rangeAtt = (attendance || []).filter(a => {
        const d = new Date(a.date);
        return d >= rangeStart && d <= rangeEnd;
      });
      const rangePlans = (lessonPlans || []).filter(p => {
        const d = new Date(p.date);
        return d >= rangeStart && d <= rangeEnd;
      });
      const rangeDueAssignments = (assignments || []).filter(a => {
        const d = new Date(a.dueDate);
        return d >= rangeStart && d <= rangeEnd && a.isPublished;
      });

      let created = 0, updated = 0;

      for (const student of (students || [])) {
        // Attendance stats
        const stuAtt = rangeAtt.filter(a => a.studentId === student.id);
        const present = stuAtt.filter(a => a.status === 'present' || a.status === 'late').length;
        const absent = stuAtt.filter(a => a.status === 'absent').length;
        const excused = stuAtt.filter(a => a.status === 'excused').length;
        const late = stuAtt.filter(a => a.status === 'late').length;
        const rate = schoolDays > 0 ? Math.round((present / schoolDays) * 100) : 0;

        // Lesson plans published for this student's class
        const classPlans = rangePlans.filter(p => p.classId === student.classId);

        // Assignments & submissions
        const classAssignments = rangeDueAssignments.filter(a => a.classId === student.classId);
        const stuSubmissions = (submissions || []).filter(s => s.studentId === student.id && classAssignments.some(a => a.id === s.assignmentId));
        const subRate = classAssignments.length > 0 ? Math.round((stuSubmissions.length / classAssignments.length) * 100) : 100;

        const reportMonth = format(rangeStart, 'yyyy-MM');
        const payload = {
          schoolId: user.schoolId,
          schoolName: user.schoolName,
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email || '',
          classId: student.classId || '',
          className: student.className || '',
          month: reportMonth,
          monthLabel: rangeLabel,
          attendancePresent: present,
          attendanceAbsent: absent,
          attendanceExcused: excused,
          attendanceLate: late,
          attendanceRate: rate,
          schoolDays,
          lessonsPublished: classPlans.length,
          assignmentsTotal: classAssignments.length,
          assignmentsSubmitted: stuSubmissions.length,
          submissionRate: subRate,
          generatedBy: user.fullName,
          status: 'draft',
        };

        // Check if report already exists for this student+date range
        const existing = reports.find(r => r.studentId === student.id && r.month === reportMonth);
        if (existing) {
          await base44.entities.StudentReport.update(existing.id, {
            ...payload,
            teacherComment: existing.teacherComment || '',
            status: existing.status === 'sent' ? 'sent' : 'draft',
          });
          updated++;
        } else {
          await base44.entities.StudentReport.create({ ...payload, teacherComment: '' });
          created++;
        }
      }

      toast.success(`Generated ${created} new, updated ${updated} existing reports`);
      await loadReports();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate reports');
    }
    setGenerating(false);
  }

  // ── Save teacher comment ──
  async function saveComment() {
    if (!commentDialog) return;
    setSavingComment(true);
    await base44.entities.StudentReport.update(commentDialog.report.id, { teacherComment: commentDialog.comment });
    toast.success('Comment saved');
    setSavingComment(false);
    setCommentDialog(null);
    loadReports();
  }

  // ── Generate PDF ──
  function buildPDF(report) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, margin = 18;
    let y = margin;

    // Header bar
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, W, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(report.schoolName || 'School', margin, 14);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Monthly Student Report — ${report.monthLabel}`, margin, 23);
    y = 44;

    // Student info block
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(report.studentName, margin, y); y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Class: ${report.className}   |   Report Month: ${report.monthLabel}`, margin, y); y += 5;
    doc.text(`Generated: ${format(new Date(), 'PPP')}   |   By: ${report.generatedBy || ''}`, margin, y); y += 10;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y); y += 8;

    // Helper: section title
    function sectionTitle(title) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(title, margin, y); y += 6;
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    }

    // Helper: stat row
    function statRow(label, value, note) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(label, margin + 4, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), margin + 70, y);
      if (note) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(130, 130, 130);
        doc.text(note, margin + 90, y);
      }
      y += 6;
    }

    // Attendance Section
    sectionTitle('Attendance');
    statRow('School Days in Month', report.schoolDays, '');
    statRow('Days Present / Late', report.attendancePresent, '');
    statRow('Days Absent', report.attendanceAbsent, '');
    statRow('Days Excused', report.attendanceExcused, '');
    statRow('Attendance Rate', `${report.attendanceRate}%`,
      report.attendanceRate >= 75 ? '[OK] Good standing' : '[!] Below 75%');
    y += 4;

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, W - margin, y); y += 8;

    // Lesson Plans Section
    sectionTitle('Lesson Plans');
    statRow('Lessons Published This Month', report.lessonsPublished, '');
    y += 4;

    doc.line(margin, y, W - margin, y); y += 8;

    // Assignments Section
    sectionTitle('Assignments');
    statRow('Assignments Given', report.assignmentsTotal, '');
    statRow('Submitted', report.assignmentsSubmitted, '');
    statRow('Submission Rate', `${report.submissionRate}%`,
      report.submissionRate >= 80 ? '[OK] Good' : report.submissionRate >= 50 ? '[~] Needs improvement' : '[!] Low');
    y += 4;

    doc.line(margin, y, W - margin, y); y += 8;

    // Teacher Comment
    if (report.teacherComment) {
      sectionTitle('Teacher\'s Comment');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(report.teacherComment, W - margin * 2 - 8);
      lines.forEach(line => {
        doc.text(line, margin + 4, y); y += 5.5;
      });
      y += 4;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`${report.schoolName} • Confidential • Generated by SchoolPulse`, margin, 285);

    return doc;
  }

  function downloadPDF(report) {
    const doc = buildPDF(report);
    doc.save(`Report_${report.studentName.replace(/\s+/g, '_')}_${report.month}.pdf`);
    toast.success('PDF downloaded');
  }

  // ── Email report to parent/student ──
  async function sendReport(report) {
    if (!report.studentEmail) return toast.error(`No email on file for ${report.studentName}`);
    setSendingId(report.id);
    try {
      const doc = buildPDF(report);
      // Build plain-text email body (PDF download not natively supported via email integration, so we send rich HTML summary)
      const body = `
Dear Parent/Guardian of ${report.studentName},

Please find below your child's monthly academic report for ${report.monthLabel}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT: ${report.studentName}
CLASS: ${report.className}
MONTH: ${report.monthLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 ATTENDANCE
  School Days: ${report.schoolDays}
  Present/Late: ${report.attendancePresent}
  Absent: ${report.attendanceAbsent}
  Excused: ${report.attendanceExcused}
  Attendance Rate: ${report.attendanceRate}%

📖 LESSON PLANS
  Lessons Published: ${report.lessonsPublished}

📝 ASSIGNMENTS
  Given: ${report.assignmentsTotal}
  Submitted: ${report.assignmentsSubmitted}
  Submission Rate: ${report.submissionRate}%

${report.teacherComment ? `💬 TEACHER'S COMMENT\n  "${report.teacherComment}"` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
This report was generated by ${report.schoolName}.
If you have questions, please contact the school administration.

Regards,
${report.schoolName}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: report.studentEmail,
        subject: `${report.monthLabel} Monthly Report — ${report.studentName}`,
        body,
      });

      await base44.entities.StudentReport.update(report.id, {
        status: 'sent',
        sentAt: new Date().toISOString(),
      });

      toast.success(`Report emailed to ${report.studentEmail}`);
      loadReports();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send report');
    }
    setSendingId(null);
  }

  async function sendAllDrafts() {
    const drafts = filteredReports.filter(r => r.status === 'draft' && r.studentEmail);
    if (!drafts.length) return toast.error('No draft reports with email addresses');
    for (const r of drafts) await sendReport(r);
  }

  const filteredReports = reports;
  const draftCount = filteredReports.filter(r => r.status === 'draft').length;
  const sentCount = filteredReports.filter(r => r.status === 'sent').length;
  const withComments = filteredReports.filter(r => r.teacherComment).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Student Monthly Reports</h1>
        <p className="text-muted-foreground mt-0.5">Generate, annotate, and email monthly progress reports to parents</p>
      </div>

      {/* Filters & Generate */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <input
              type="date"
              value={dateRange.startDate}
              max={dateRange.endDate}
              onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <input
              type="date"
              value={dateRange.endDate}
              min={dateRange.startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateReports} disabled={generating} className="sm:ml-auto">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {generating ? 'Generating…' : 'Generate Reports'}
          </Button>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Reports', value: filteredReports.length, icon: FileText, color: 'text-blue-600 bg-blue-100' },
          { label: 'Drafts', value: draftCount, icon: Clock, color: 'text-amber-600 bg-amber-100' },
          { label: 'Sent', value: sentCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'With Comments', value: withComments, icon: BookOpen, color: 'text-purple-600 bg-purple-100' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-2xl font-bold mt-1">{c.value}</p></div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}><c.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send All button */}
      {draftCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={sendAllDrafts}>
            <Send className="w-4 h-4 mr-2" /> Send All Drafts ({draftCount})
          </Button>
        </div>
      )}

      {/* Report List */}
      {filteredReports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium">No reports yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Generate Reports" to create monthly summaries for all students.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => (
            <Card key={report.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{report.studentName}</p>
                      <Badge variant="secondary" className="text-xs">{report.className}</Badge>
                      <Badge className={report.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700 text-xs'
                        : 'bg-amber-100 text-amber-700 text-xs'}>
                        {report.status === 'sent' ? '✓ Sent' : 'Draft'}
                      </Badge>
                    </div>
                    {/* Mini stats */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Attendance: <strong className={`ml-0.5 ${report.attendanceRate >= 75 ? 'text-emerald-700' : 'text-red-600'}`}>{report.attendanceRate}%</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Lessons: <strong className="ml-0.5">{report.lessonsPublished}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" />
                        Submissions: <strong className="ml-0.5">{report.assignmentsSubmitted}/{report.assignmentsTotal}</strong>
                      </span>
                      {report.teacherComment && (
                        <span className="text-purple-600">💬 Comment added</span>
                      )}
                      {report.status === 'sent' && report.sentAt && (
                        <span>Sent {format(new Date(report.sentAt), 'MMM d, HH:mm')}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Button size="sm" variant="outline"
                      onClick={() => setCommentDialog({ report, comment: report.teacherComment || '' })}>
                      ✏️ {report.teacherComment ? 'Edit Comment' : 'Add Comment'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPDF(report)}>
                      <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                    </Button>
                    <Button size="sm"
                      onClick={() => sendReport(report)}
                      disabled={sendingId === report.id || !report.studentEmail}
                      title={!report.studentEmail ? 'No email on file' : ''}
                      className={report.status === 'sent' ? 'opacity-70' : ''}>
                      {sendingId === report.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Send className="w-3.5 h-3.5 mr-1.5" />}
                      {report.status === 'sent' ? 'Resend' : 'Send'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comment Dialog */}
      <Dialog open={!!commentDialog} onOpenChange={() => setCommentDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Teacher's Comment — {commentDialog?.report?.studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This comment will be included in the PDF report and email sent to parents.
            </p>
            {/* Quick stats reminder */}
            {commentDialog?.report && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/40 rounded-lg text-center text-xs">
                <div>
                  <p className="font-bold text-base">{commentDialog.report.attendanceRate}%</p>
                  <p className="text-muted-foreground">Attendance</p>
                </div>
                <div>
                  <p className="font-bold text-base">{commentDialog.report.lessonsPublished}</p>
                  <p className="text-muted-foreground">Lessons</p>
                </div>
                <div>
                  <p className="font-bold text-base">{commentDialog.report.submissionRate}%</p>
                  <p className="text-muted-foreground">Submissions</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                rows={5}
                placeholder="e.g. This student has shown great improvement in class participation this month. We encourage continued effort in assignment submissions..."
                value={commentDialog?.comment || ''}
                onChange={e => setCommentDialog(d => ({ ...d, comment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCommentDialog(null)}>Cancel</Button>
            <Button onClick={saveComment} disabled={savingComment}>
              {savingComment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}