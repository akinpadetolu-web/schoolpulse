import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, UserPlus, CheckCircle2, XCircle, Clock, AlertCircle, BookOpen, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { setCurrentUser } from '@/lib/auth';

function AttendanceBar({ present, absent, late, excused }) {
  const total = present + absent + late + excused;
  if (total === 0) return <p className="text-xs text-muted-foreground">No attendance records</p>;
  const rate = Math.round((present / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Attendance rate</span>
        <span className={`font-semibold ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${(present / total) * 100}%` }} />
        <div className="h-full bg-amber-400" style={{ width: `${(late / total) * 100}%` }} />
        <div className="h-full bg-blue-400" style={{ width: `${(excused / total) * 100}%` }} />
        <div className="h-full bg-red-400" style={{ width: `${(absent / total) * 100}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {[
          { color: 'bg-emerald-500', label: `${present} Present` },
          { color: 'bg-amber-400', label: `${late} Late` },
          { color: 'bg-blue-400', label: `${excused} Excused` },
          { color: 'bg-red-400', label: `${absent} Absent` },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const user = getCurrentUser();
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  // Auto-open the add child dialog if no children are linked yet (first login)
  useEffect(() => {
    const linkedIds = user?.linkedStudentIds || [];
    if (linkedIds.length === 0) setShowAddChild(true);
    load(linkedIds);
  }, [user?.linkedStudentIds]);

  async function load(linkedIds) {
    setLoading(true);
    const ids = linkedIds || user?.linkedStudentIds || [];
    if (ids.length > 0) {
      try {
        // Fetch students first
        const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
        const linkedStudents = (allStudents || []).filter(s => ids.includes(s.id));
        setChildren(linkedStudents);

        // Then fetch related data in batches to avoid rate limit
        const [att, allGrades] = await Promise.all([
          base44.entities.Attendance.filter({ schoolId: user?.schoolId }),
          base44.entities.Grade.filter({ schoolId: user?.schoolId }),
        ]);
        
        setAttendance((att || []).filter(a => ids.includes(a.studentId)));
        setGrades((allGrades || []).filter(g => ids.includes(g.studentId)));

        // Fetch assignments and timetable
        const [allAssignments, allTimetable] = await Promise.all([
          base44.entities.Assignment.filter({ schoolId: user?.schoolId }),
          base44.entities.TimetableEntry.filter({ schoolId: user?.schoolId }),
        ]);

        setAssignments((allAssignments || []).filter(a => linkedStudents.some(child => a.classId === child?.classId)));
        setTimetable((allTimetable || []).filter(t => linkedStudents.some(child => t.classId === child?.classId)));
      } catch (error) {
        console.error('Failed to load parent dashboard data:', error);
      }
    }
    setLoading(false);
  }

  async function handleAddChild(e) {
    e.preventDefault();
    setLinking(true);
    // Find student with matching parentLinkCode
    const matches = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student', parentLinkCode: linkCode.trim() });
    if (!matches || matches.length === 0) {
      toast.error('No student found with that link code. Please check with the school admin.');
      setLinking(false);
      return;
    }
    const student = matches[0];
    const currentLinked = user?.linkedStudentIds || [];
    if (currentLinked.includes(student.id)) {
      toast.info('This child is already linked to your account.');
      setLinking(false);
      return;
    }
    const newLinked = [...currentLinked, student.id];
    await base44.auth.updateMe({ linkedStudentIds: newLinked });
    const updatedUser = await base44.auth.me();
    setCurrentUser(updatedUser);
    toast.success(`${student.fullName} linked successfully!`);
    setLinkCode('');
    setShowAddChild(false);
  }

  const attendanceByStudent = useMemo(() => {
    const map = {};
    attendance.forEach(a => {
      if (!map[a.studentId]) map[a.studentId] = { present: 0, absent: 0, late: 0, excused: 0 };
      const s = a.status;
      if (s === 'present') map[a.studentId].present++;
      else if (s === 'absent') map[a.studentId].absent++;
      else if (s === 'late') map[a.studentId].late++;
      else if (s === 'excused') map[a.studentId].excused++;
    });
    return map;
  }, [attendance]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground">{user?.schoolName}</p>
        </div>
        <Button onClick={() => setShowAddChild(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Child
        </Button>
      </div>

      <div>
         <h2 className="text-lg font-semibold mb-4">My Children</h2>
        {children.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <GraduationCap className="w-10 h-10 opacity-30" />
              <p>No linked children yet.</p>
              <Button variant="outline" size="sm" onClick={() => setShowAddChild(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Link a Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {children.map((child, index) => {
              const childColors = ['bg-blue-100 border-blue-300', 'bg-purple-100 border-purple-300', 'bg-green-100 border-green-300', 'bg-amber-100 border-amber-300'];
              const childColor = childColors[index % childColors.length];
              const att = attendanceByStudent[child.id] || { present: 0, absent: 0, late: 0, excused: 0 };
              const childAssignments = assignments.filter(a => a.classId === child.classId);
              const childTimetable = timetable.filter(t => t.classId === child.classId);
              const childGrades = grades.filter(g => g.studentId === child.id);
              const avgGrade = childGrades.length > 0 ? Math.round(childGrades.reduce((sum, g) => sum + (g.score || 0), 0) / childGrades.length) : null;
              
              return (
                <Card key={child.id} className={`border-2 shadow-sm ${childColor}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-current">
                        <span className="font-bold text-lg">{child.fullName?.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{child.fullName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{child.className || 'No class assigned'}</p>
                      </div>
                      {avgGrade && <Badge className="text-base px-3 py-1">Avg: {avgGrade}%</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="attendance" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
                        <TabsTrigger value="assignments" className="text-xs">Assignments</TabsTrigger>
                        <TabsTrigger value="timetable" className="text-xs">Timetable</TabsTrigger>
                        <TabsTrigger value="grades" className="text-xs">Grades</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="attendance" className="space-y-3 mt-4">
                        <AttendanceBar {...att} />
                      </TabsContent>
                      
                      <TabsContent value="assignments" className="space-y-3 mt-4">
                        {childAssignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No assignments assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {childAssignments.slice(0, 5).map(a => (
                              <div key={a.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                                <FileText className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{a.title}</p>
                                  <p className="text-xs text-muted-foreground">Due: {a.dueDate ? format(new Date(a.dueDate), 'MMM d') : 'No date'}</p>
                                </div>
                              </div>
                            ))}
                            {childAssignments.length > 5 && <p className="text-xs text-muted-foreground">+{childAssignments.length - 5} more</p>}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="timetable" className="space-y-3 mt-4">
                        {childTimetable.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No timetable entries</p>
                        ) : (
                          <div className="space-y-2">
                            {childTimetable.slice(0, 5).map(t => (
                              <div key={t.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                                <Calendar className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{t.subjectName || 'Subject'}</p>
                                  <p className="text-xs text-muted-foreground">{t.day} • {t.startTime || 'Time TBA'}</p>
                                </div>
                              </div>
                            ))}
                            {childTimetable.length > 5 && <p className="text-xs text-muted-foreground">+{childTimetable.length - 5} more</p>}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="grades" className="space-y-3 mt-4">
                        {childGrades.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No grades recorded</p>
                        ) : (
                          <div className="space-y-2">
                            {childGrades.slice(0, 5).map(g => (
                              <div key={g.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{g.subjectName || 'Subject'}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{g.assessmentType}</p>
                                </div>
                                <Badge variant="secondary">{g.score}/{g.maxScore}</Badge>
                              </div>
                            ))}
                            {childGrades.length > 5 && <p className="text-xs text-muted-foreground">+{childGrades.length - 5} more</p>}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Child Dialog */}
      <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link a Child</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the student link code provided by your school administrator to connect your child's account.</p>
          <form onSubmit={handleAddChild} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Student Link Code</Label>
              <Input
                value={linkCode}
                onChange={e => setLinkCode(e.target.value)}
                placeholder="e.g. LINK-AB12CD"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={linking}>
              {linking && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Link Child
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}