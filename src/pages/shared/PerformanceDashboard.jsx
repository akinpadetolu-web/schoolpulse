import React, { useState, useEffect, useMemo } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function PerformanceDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [submissionData, setSubmissionData] = useState([]);

  // Filter classes based on user role
  useEffect(() => {
    async function loadClasses() {
      try {
        let classesData = [];
        if (user?.role === 'admin') {
          classesData = await base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false });
        } else if (user?.role === 'teacher') {
          const allClasses = await base44.entities.SchoolClass.filter({ schoolId: user.schoolId, isArchived: false });
          classesData = allClasses.filter(c => (user.assignedClasses || []).includes(c.id));
        }
        setClasses(classesData || []);
        if (classesData.length > 0) setSelectedClass(classesData[0].id);
      } catch {
        toast.error('Failed to load classes');
      }
    }
    loadClasses();
  }, [user]);

  // Load performance data
  useEffect(() => {
    if (!selectedClass) return;
    loadPerformanceData();
  }, [selectedClass]);

  async function loadPerformanceData() {
    setLoading(true);
    try {
      const [attendance, submissions, assignments] = await Promise.all([
        base44.entities.Attendance.filter({ schoolId: user.schoolId, classId: selectedClass }),
        base44.entities.Submission.filter({ schoolId: user.schoolId }),
        base44.entities.Assignment.filter({ schoolId: user.schoolId }),
      ]);

      // Build 6-month attendance trend
      const attendanceByMonth = {};
      for (let i = 5; i >= 0; i--) {
        const month = startOfMonth(subMonths(new Date(), i));
        const key = format(month, 'MMM yyyy');
        attendanceByMonth[key] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      }

      (attendance || []).forEach(a => {
        if (a.date) {
          const month = startOfMonth(new Date(a.date));
          const key = format(month, 'MMM yyyy');
          if (attendanceByMonth[key]) {
            attendanceByMonth[key].total++;
            if (a.status === 'present') attendanceByMonth[key].present++;
            else if (a.status === 'absent') attendanceByMonth[key].absent++;
            else if (a.status === 'late') attendanceByMonth[key].late++;
            else if (a.status === 'excused') attendanceByMonth[key].excused++;
          }
        }
      });

      const attData = Object.entries(attendanceByMonth).map(([month, stats]) => ({
        month,
        rate: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
        present: stats.present,
        absent: stats.absent,
      }));

      // Build 6-month submission trend
      const submissionByMonth = {};
      for (let i = 5; i >= 0; i--) {
        const month = startOfMonth(subMonths(new Date(), i));
        const key = format(month, 'MMM yyyy');
        submissionByMonth[key] = { submitted: 0, total: 0 };
      }

      const classAssignments = (assignments || []).filter(a => a.classId === selectedClass);
      (submissions || []).forEach(s => {
        if (classAssignments.some(a => a.id === s.assignmentId) && s.submittedAt) {
          const month = startOfMonth(new Date(s.submittedAt));
          const key = format(month, 'MMM yyyy');
          if (submissionByMonth[key]) {
            submissionByMonth[key].submitted++;
          }
        }
      });

      classAssignments.forEach(a => {
        if (a.dueDate) {
          const month = startOfMonth(new Date(a.dueDate));
          const key = format(month, 'MMM yyyy');
          if (submissionByMonth[key]) {
            submissionByMonth[key].total++;
          }
        }
      });

      const subData = Object.entries(submissionByMonth).map(([month, stats]) => ({
        month,
        rate: stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0,
        submitted: stats.submitted,
        total: stats.total,
      }));

      setAttendanceData(attData);
      setSubmissionData(subData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load performance data');
    }
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Performance Trends
        </h1>
        <p className="text-muted-foreground mt-0.5">View class-wide performance metrics over the past 6 months</p>
      </div>

      {/* Class Filter */}
      {classes.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Attendance Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(225, 73%, 57%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(225, 73%, 57%)', r: 4 }}
                    name="Attendance Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Submission Rate Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Submission Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {submissionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={submissionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(160, 60%, 45%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(160, 60%, 45%)', r: 4 }}
                    name="Submission Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Attendance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="hsl(160, 60%, 45%)" name="Present" />
                <Bar dataKey="absent" fill="hsl(0, 84%, 60%)" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}