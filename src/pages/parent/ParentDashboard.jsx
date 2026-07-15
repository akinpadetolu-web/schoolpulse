import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Loader2, UserPlus, TrendingUp, TrendingDown, AlertCircle, BookOpen, Calendar, FileText, FlaskConical, ClipboardList, AlertTriangle } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ExamProgressReport from '@/components/parent/ExamProgressReport';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';

function AttendanceBar({ present, absent, late, excused }) {
  const total = present + absent + late + excused;
  if (total === 0) return <p className="text-xs text-slate-600">No attendance records</p>;
  const rate = Math.round((present / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-700 font-medium">Attendance rate</span>
        <span className={`font-semibold ${rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-300 overflow-hidden flex">
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
          <span key={label} className="flex items-center gap-1 text-xs text-slate-700 font-medium">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examResults, setExamResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);

  // Auto-open the add child dialog if no children are linked yet (first login)
  // Reload data whenever user.linkedStudentIds changes
  useEffect(() => {
    if (!user) return;
    const linkedIds = user?.linkedStudentIds || [];
    if (linkedIds.length === 0) setShowAddChild(true);
    load(linkedIds);
  }, [user?.id, user?.linkedStudentIds]);

  async function load(linkedIds) {
    setLoading(true);
    const ids = linkedIds || user?.linkedStudentIds || [];
    if (ids.length > 0) {
      try {
        // Fetch only students data first
        const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
        const linkedStudents = (allStudents || []).filter(s => ids.includes(s.id));
        setChildren(linkedStudents);
      } catch (error) {
        console.error('Failed to load students:', error);
      }
    }
    setLoading(false);

    // Fetch detailed data with individual error handling and delays
    if (ids.length > 0) {
      loadAttendanceData(ids);
      loadGradesData(ids);
      loadAssignmentsData(ids);
      loadExamResultsData(ids);
      loadGradeCategories();
    }
  }

  async function loadGradeCategories() {
    try {
      const cats = await base44.entities.GradeCategory.filter({ schoolId: user?.schoolId }).catch(() => []);
      setCategories(cats || []);
    } catch {
      setCategories([]);
    }
  }

  async function loadAttendanceData(ids) {
    setLoadingAttendance(true);
    try {
      if (ids.length === 0) {
        setAttendance([]);
        setLoadingAttendance(false);
        return;
      }
      const promises = ids.map(studentId => 
        base44.entities.Attendance.filter({ schoolId: user?.schoolId, studentId }).catch(() => [])
      );
      const results = await Promise.all(promises);
      const allAtt = results.flat().filter(Boolean);
      setAttendance(allAtt);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function loadGradesData(ids) {
    setLoadingGrades(true);
    try {
      if (ids.length === 0) {
        setGrades([]);
        setLoadingGrades(false);
        return;
      }
      const promises = ids.map(studentId => 
        base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId }).catch(() => [])
      );
      const results = await Promise.all(promises);
      const allGrades = results.flat().filter(Boolean);
      setGrades(allGrades);
    } catch (error) {
      console.error('Failed to load grades:', error);
      setGrades([]);
    } finally {
      setLoadingGrades(false);
    }
  }

  async function loadAssignmentsData(ids) {
    setLoadingAssignments(true);
    try {
      if (ids.length === 0) {
        setAssignments([]);
        setLoadingAssignments(false);
        return;
      }
      const linkedStudents = (await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' })).filter(s => ids.includes(s.id));
      const classIds = [...new Set(linkedStudents.map(s => s.classId).filter(Boolean))];
      if (classIds.length === 0) {
        setAssignments([]);
        setLoadingAssignments(false);
        return;
      }
      const promises = classIds.map(classId => 
        base44.entities.Assignment.filter({ schoolId: user?.schoolId, classId }).catch(() => [])
      );
      const results = await Promise.all(promises);
      const allAssignments = results.flat().filter(Boolean);
      setAssignments(allAssignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadExamResultsData(ids) {
    setLoadingExams(true);
    try {
      if (ids.length === 0) {
        setExamResults([]);
        setLoadingExams(false);
        return;
      }
      const promises = ids.map(studentId => 
        base44.entities.ExamResult.filter({ schoolId: user?.schoolId, studentId }).catch(() => [])
      );
      const results = await Promise.all(promises);
      const allResults = results.flat().filter(Boolean);
      setExamResults(allResults);
    } catch (error) {
      console.error('Failed to load exam results:', error);
      setExamResults([]);
    } finally {
      setLoadingExams(false);
    }
  }

  async function handleAddChild(e) {
    e.preventDefault();
    setLinking(true);
    try {
      const searchInput = linkCode.trim().toUpperCase();
      
      // Fetch all students in this school
      const allStudents = await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: 'student' });
      
      // Search by parent link code OR student ID OR full name
      const matches = (allStudents || []).filter(s => 
        s.parentLinkCode?.toUpperCase() === searchInput ||
        s.id === searchInput ||
        s.fullName?.toUpperCase().includes(searchInput)
      );
      
      if (!matches || matches.length === 0) {
        toast.error('Student not found. Search by link code, ID, or name.');
        setLinking(false);
        return;
      }
      
      const student = matches[0];
      const currentLinked = user?.linkedStudentIds || [];
      
      // Prevent duplicate linking
      if (currentLinked.includes(student.id)) {
        toast.info(`${student.fullName} is already linked to your account.`);
        setLinking(false);
        return;
      }
      
      // Update parent's linkedStudentIds in SchoolUser entity
      const newLinked = [...currentLinked, student.id];
      await base44.entities.SchoolUser.update(user.id, { linkedStudentIds: newLinked });
      
      // Reload parent data to reflect the change
      const updatedParent = await base44.entities.SchoolUser.filter({ id: user.id });
      if (updatedParent && updatedParent[0]) {
        // Trigger useEffect by directly updating the linked IDs
        await load(newLinked);
      }
      
      toast.success(`${student.fullName} linked successfully!`);
      setLinkCode('');
      setShowAddChild(false);
    } catch (error) {
      console.error('Error linking child:', error);
      toast.error('Failed to link child. Please try again.');
    } finally {
      setLinking(false);
    }
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
    <div className="space-y-4 px-3 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Welcome, {user?.fullName}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.schoolName}</p>
        </div>
        <Button onClick={() => setShowAddChild(true)} className="h-9 sm:h-10">
          <UserPlus className="w-4 h-4 mr-2" /> Add Child
        </Button>
      </div>

      <div className="space-y-4">
         <h2 className="text-lg font-semibold px-3 sm:px-0">My Children</h2>
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
              const childColors = ['bg-blue-100 border-blue-300', 'bg-purple-100 border-purple-300', 'bg-green-100 border-green-300', 'bg-pink-100 border-pink-300'];
              const childColor = childColors[index % childColors.length];
              const att = attendanceByStudent[child.id] || { present: 0, absent: 0, late: 0, excused: 0 };
              const childAssignments = assignments.filter(a => a.classId === child.classId);
              const childGrades = grades.filter(g => g.studentId === child.id);
              const childExamResults = examResults.filter(e => e.studentId === child.id);

              // Compute per-subject weighted averages using grade weight calculator
              const gradesBySubject = {};
              childGrades.forEach(g => {
                const key = g.subjectId || g.subjectName;
                if (!gradesBySubject[key]) gradesBySubject[key] = { name: g.subjectName, grades: [] };
                gradesBySubject[key].grades.push(g);
              });
              const subjectAverages = Object.values(gradesBySubject).map(({ name, grades: sg }) => {
                const classCats = categories.filter(c => c.subjectId === (sg[0]?.subjectId) && c.classId === child.classId);
                const result = getSubjectFinalGrade(sg, classCats);
                return { subject: name, avg: result.overall !== null ? Math.round(result.overall) : null };
              }).filter(s => s.avg !== null);

              const avgGrade = subjectAverages.length > 0
                ? Math.round(subjectAverages.reduce((s, v) => s + v.avg, 0) / subjectAverages.length)
                : (childExamResults.length > 0 ? Math.round(childExamResults.reduce((s, e) => s + ((e.score / (e.maxScore || 100)) * 100), 0) / childExamResults.length) : null);
              
              return (
                <Card key={child.id} className={`border-2 shadow-sm ${childColor}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <UserAvatar user={child} size="xl" className="shrink-0" />
                      <div className="flex-1">
                        <CardTitle className="text-lg text-slate-900">{child.fullName}</CardTitle>
                        <p className="text-sm text-slate-700">{child.className || 'No class assigned'}</p>
                      </div>
                      {avgGrade && <Badge className="text-base px-3 py-1 bg-blue-600 text-white border-0">Avg: {avgGrade}%</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Grades Summary */}
                    {(subjectAverages.length > 0 || childExamResults.length > 0) && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Grade Summary</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {subjectAverages.map(({ subject, avg }) => (
                            <div key={subject} className="flex flex-col items-center justify-center bg-white rounded-lg border border-slate-300 px-3 py-2">
                              <span className="text-xs font-medium truncate text-slate-700">{subject}</span>
                              <span className={`text-sm font-bold mt-1 ${avg >= 70 ? 'text-emerald-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avg}%</span>
                            </div>
                          ))}
                          {childExamResults.length > 0 && subjectAverages.length === 0 && childExamResults.map(e => (
                            <div key={e.id} className="flex flex-col items-center justify-center bg-white rounded-lg border border-slate-300 px-3 py-2">
                              <span className="text-xs font-medium truncate text-slate-700">{e.subjectName}</span>
                              <span className={`text-sm font-bold mt-1 ${((e.score / (e.maxScore || 100)) * 100) >= 70 ? 'text-emerald-600' : ((e.score / (e.maxScore || 100)) * 100) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round((e.score / (e.maxScore || 100)) * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Tabs defaultValue="attendance" className="w-full">
                      <TabsList className="grid w-full grid-cols-4 bg-slate-900">
                         <TabsTrigger value="attendance" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Attendance</TabsTrigger>
                         <TabsTrigger value="assignments" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Assignments</TabsTrigger>
                         <TabsTrigger value="grades" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Grades</TabsTrigger>
                         <TabsTrigger value="exams" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Exams</TabsTrigger>
                       </TabsList>
                      
                      <TabsContent value="attendance" className="space-y-3 mt-4">
                        {loadingAttendance ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading attendance...
                          </div>
                        ) : (
                          <AttendanceBar {...att} />
                        )}
                      </TabsContent>
                      
                      <TabsContent value="assignments" className="space-y-3 mt-4">
                        {loadingAssignments ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading assignments...
                          </div>
                        ) : childAssignments.length === 0 ? (
                          <p className="text-sm text-slate-600">No assignments assigned</p>
                        ) : (
                          <div className="space-y-2">
                           {childAssignments.slice(0, 5).map(a => {
                             const today = new Date().toISOString().slice(0, 10);
                             const isLate = a.dueDate && a.dueDate < today;
                             return (
                               <div key={a.id} className={`flex items-start gap-2 p-2 bg-white rounded border ${isLate ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}>
                                 <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isLate ? 'text-red-500' : 'text-blue-600'}`} />
                                 <div className="flex-1 min-w-0">
                                   <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                                   <p className={`text-xs ${isLate ? 'text-red-500' : 'text-slate-600'}`}>Due: {a.dueDate ? format(new Date(a.dueDate), 'MMM d') : 'No date'}</p>
                                 </div>
                                 {isLate && (
                                   <Badge className="text-xs bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 shrink-0">
                                     <AlertTriangle className="w-3 h-3" /> Late
                                   </Badge>
                                 )}
                               </div>
                             );
                           })}
                           {childAssignments.length > 5 && <p className="text-xs text-slate-600">+{childAssignments.length - 5} more</p>}
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="grades" className="space-y-3 mt-4">
                        {loadingGrades ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading grades...
                          </div>
                        ) : childGrades.length === 0 ? (
                          <p className="text-sm text-slate-600">No grades recorded</p>
                        ) : (
                          <div className="space-y-2">
                            {childGrades.slice(0, 5).map(g => (
                              <div key={g.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-300">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{g.subjectName || 'Subject'}</p>
                                  <p className="text-xs text-slate-600 capitalize">{g.assessmentType}</p>
                                </div>
                                <Badge variant="secondary" className="text-slate-700">{g.score}/{g.maxScore}</Badge>
                              </div>
                            ))}
                            {childGrades.length > 5 && <p className="text-xs text-slate-600">+{childGrades.length - 5} more</p>}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="exams" className="mt-4">
                        {loadingExams ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading exam results...
                          </div>
                        ) : (
                          <ExamProgressReport child={child} examResults={examResults} />
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
          <p className="text-sm text-muted-foreground">Search for your child by link code, student ID, or full name.</p>
          <form onSubmit={handleAddChild} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                value={linkCode}
                onChange={e => setLinkCode(e.target.value)}
                placeholder="Link code, student ID, or full name"
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