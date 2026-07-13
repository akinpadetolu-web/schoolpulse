import React, { useState } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { calculateWeightedScore } from '@/lib/gradeWeightCalculator';

export default function AdminSchoolReport() {
  const { schoolUser: user } = useSchoolAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const [dateRange, setDateRange] = useState({
    startDate: '2025-01-01',
    endDate: '2025-04-05',
  });

  async function generateReport(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      const [attendanceData, submissionData, gradeData, assignmentData, studentData, categoryData] = await Promise.all([
        base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
        base44.entities.Submission.filter({ schoolId: user?.schoolId }),
        base44.entities.Grade.filter({ schoolId: user?.schoolId }),
        base44.entities.Assignment.filter({ schoolId: user?.schoolId }),
        base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' }),
        base44.entities.GradeCategory.filter({ schoolId: user?.schoolId }),
      ]);

      // Filter by date range
      const filteredAttendance = (attendanceData || []).filter(a => {
        const d = new Date(a.date);
        return d >= start && d <= end;
      });

      const filteredSubmissions = (submissionData || []).filter(s => {
        const d = new Date(s.submittedAt);
        return d >= start && d <= end;
      });

      const filteredGrades = (gradeData || []).filter(g => {
        const d = new Date(g.created_date);
        return d >= start && d <= end;
      });

      // Calculate metrics
      const totalStudents = studentData?.length || 0;
      const totalAttendanceRecords = filteredAttendance.length;
      const presentRecords = filteredAttendance.filter(a => a.status === 'present').length;
      const absentRecords = filteredAttendance.filter(a => a.status === 'absent').length;
      const lateRecords = filteredAttendance.filter(a => a.status === 'late').length;
      const excusedRecords = filteredAttendance.filter(a => a.status === 'excused').length;

      const attendanceRate = totalAttendanceRecords > 0
        ? Math.round((presentRecords / totalAttendanceRecords) * 100)
        : 0;

      const submissionRate = filteredSubmissions.length > 0
        ? Math.round((filteredSubmissions.filter(s => !s.isGraded).length / filteredSubmissions.length) * 100)
        : 0;

      // Compute weighted scores per student-subject pair
      const studentSubjectGroups = {};
      filteredGrades.forEach(g => {
        const key = `${g.studentId}__${g.subjectId}`;
        if (!studentSubjectGroups[key]) studentSubjectGroups[key] = [];
        studentSubjectGroups[key].push(g);
      });

      const weightedScores = Object.entries(studentSubjectGroups).map(([key, groupGrades]) => {
        const [studentId, subjectId] = key.split('__');
        const classId = groupGrades[0]?.classId;
        const classCats = (categoryData || []).filter(c => !c.classId || c.classId === classId);
        return calculateWeightedScore(groupGrades, classCats, studentId, subjectId).overall;
      }).filter(s => s > 0);

      const averageGrade = weightedScores.length > 0
        ? Math.round(weightedScores.reduce((sum, s) => sum + s, 0) / weightedScores.length)
        : 0;

      // Grade distribution based on weighted scores
      const gradeDistribution = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
      };

      weightedScores.forEach(score => {
        if (score >= 90) gradeDistribution.A++;
        else if (score >= 80) gradeDistribution.B++;
        else if (score >= 70) gradeDistribution.C++;
        else if (score >= 60) gradeDistribution.D++;
        else gradeDistribution.F++;
      });

      // Attendance by day
      const attendanceByDay = {};
      filteredAttendance.forEach(a => {
        const date = a.date;
        if (!attendanceByDay[date]) {
          attendanceByDay[date] = { present: 0, absent: 0, late: 0, excused: 0 };
        }
        attendanceByDay[date][a.status]++;
      });

      const attendanceChartData = Object.entries(attendanceByDay)
        .sort()
        .slice(-30) // Last 30 days
        .map(([date, data]) => ({ date, ...data }));

      setReport({
        period: `${dateRange.startDate} to ${dateRange.endDate}`,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        metrics: {
          totalStudents,
          attendanceRate,
          averageGrade,
          submissionRate,
          totalAttendanceRecords,
          presentRecords,
          absentRecords,
          lateRecords,
          excusedRecords,
          totalSubmissions: filteredSubmissions.length,
          totalGrades: filteredGrades.length,
        },
        gradeDistribution,
        attendanceChartData,
      });

      toast.success('Report generated successfully');
    } catch (err) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text(`${user?.schoolName} - School Report`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${report.period}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Key Metrics section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Key Metrics', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const metricsData = [
      `Total Students: ${report.metrics.totalStudents}`,
      `Attendance Rate: ${report.metrics.attendanceRate}%`,
      `Average Grade: ${report.metrics.averageGrade}%`,
      `Submission Rate: ${report.metrics.submissionRate}%`,
      `Total Attendance Records: ${report.metrics.totalAttendanceRecords}`,
      `Present: ${report.metrics.presentRecords} | Absent: ${report.metrics.absentRecords} | Late: ${report.metrics.lateRecords} | Excused: ${report.metrics.excusedRecords}`,
      `Total Submissions: ${report.metrics.totalSubmissions}`,
      `Total Grades Recorded: ${report.metrics.totalGrades}`,
    ];

    metricsData.forEach(metric => {
      doc.text(metric, 20, yPos);
      yPos += 7;
    });

    yPos += 10;

    // Grade distribution section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Grade Distribution', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const gradeData = [
      `A: ${report.gradeDistribution.A}`,
      `B: ${report.gradeDistribution.B}`,
      `C: ${report.gradeDistribution.C}`,
      `D: ${report.gradeDistribution.D}`,
      `F: ${report.gradeDistribution.F}`,
    ];

    gradeData.forEach(grade => {
      doc.text(grade, 20, yPos);
      yPos += 7;
    });

    doc.save(`School_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf`);
    toast.success('Report downloaded');
  }

  const gradeChartData = [
    { name: 'A', value: report?.gradeDistribution.A || 0, color: '#10b981' },
    { name: 'B', value: report?.gradeDistribution.B || 0, color: '#3b82f6' },
    { name: 'C', value: report?.gradeDistribution.C || 0, color: '#f59e0b' },
    { name: 'D', value: report?.gradeDistribution.D || 0, color: '#ef4444' },
    { name: 'F', value: report?.gradeDistribution.F || 0, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">School Report Generator</h1>

      {/* Date Range Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Select Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={generateReport} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Generate Report
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Report Display */}
      {report && (
        <>
          {/* Download Button */}
          <div className="flex justify-end">
            <Button onClick={downloadPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold mt-1">{report.metrics.totalStudents}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{report.metrics.attendanceRate}%</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Average Grade</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{report.metrics.averageGrade}%</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Submission Rate</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{report.metrics.submissionRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-xl font-bold text-emerald-600">{report.metrics.presentRecords}</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-xl font-bold text-red-600">{report.metrics.absentRecords}</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-xl font-bold text-amber-600">{report.metrics.lateRecords}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Excused</p>
                  <p className="text-xl font-bold text-blue-600">{report.metrics.excusedRecords}</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Submissions</p>
                  <p className="text-xl font-bold text-purple-600">{report.metrics.totalSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Grade Distribution Pie Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gradeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gradeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Trend Bar Chart */}
            {report.attendanceChartData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Attendance Trend (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report.attendanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#10b981" />
                      <Bar dataKey="absent" fill="#ef4444" />
                      <Bar dataKey="late" fill="#f59e0b" />
                      <Bar dataKey="excused" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}