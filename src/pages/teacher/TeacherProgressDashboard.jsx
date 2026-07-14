import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { getSubjectFinalGrade } from '@/lib/gradeWeightCalculator';

export default function TeacherProgressDashboard() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, [user?.id]);

  useEffect(() => {
    if (selectedClass) {
      loadStudentData();
    }
  }, [selectedClass]);

  async function loadClasses() {
    try {
      const allClasses = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId });
      const teacherClasses = (allClasses || []).filter(c =>
        user?.assignedClasses?.includes(c.id)
      );
      setClasses(teacherClasses);
      if (teacherClasses.length > 0) {
        setSelectedClass(teacherClasses[0].id);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }

  async function loadStudentData() {
    setLoading(true);
    try {
      // Get students in selected class
      const classStudents = await base44.entities.SchoolUser.filter({
        schoolId: user?.schoolId,
        classId: selectedClass,
        role: 'student',
        isArchived: false
      });
      setStudents(classStudents || []);

      // Get grades for all students in class
      const classGrades = await base44.entities.Grade.filter({
        schoolId: user?.schoolId,
        classId: selectedClass
      });
      setGrades(classGrades || []);

      // Get assignment submissions
      const classSubmissions = await base44.entities.Submission.filter({
        schoolId: user?.schoolId
      });
      setSubmissions(classSubmissions || []);

      // Get quiz submissions
      const quizSubs = await base44.entities.QuizSubmission.filter({
        schoolId: user?.schoolId
      });
      setQuizSubmissions(quizSubs || []);

      const cats = await base44.entities.GradeCategory.filter({ schoolId: user?.schoolId });
      setCategories(cats || []);
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate student metrics
  const studentMetrics = useMemo(() => {
    return students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const studentSubmissions = submissions.filter(s => s.studentId === student.id);
      const studentQuizzes = quizSubmissions.filter(q => q.studentId === student.id);

      // Weighted average grade across subjects
      let avgGrade = 0;
      if (studentGrades.length > 0) {
        const subjMap = {};
        studentGrades.forEach(g => {
          if (!subjMap[g.subjectId]) subjMap[g.subjectId] = { classId: g.classId, grades: [] };
          subjMap[g.subjectId].grades.push(g);
        });
        const subjAvgs = Object.entries(subjMap).map(([subjectId, { classId, grades: sg }]) => {
          const classCats = categories.filter(c => c.subjectId === subjectId && c.classId === classId);
          const { overall } = getSubjectFinalGrade(sg, classCats);
          return overall;
        }).filter(v => v !== null);
        avgGrade = subjAvgs.length > 0 ? Math.round(subjAvgs.reduce((a, b) => a + b, 0) / subjAvgs.length) : 0;
      }

      // Assignment submission rate
      const submissionRate = studentSubmissions.length > 0
        ? Math.round((studentSubmissions.filter(s => s.submittedAt).length / studentSubmissions.length) * 100)
        : 0;

      // Quiz average
      const quizAvg = studentQuizzes.length > 0
        ? Math.round(studentQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / studentQuizzes.length)
        : 0;

      // Overall performance score (weighted average)
      const performanceScore = Math.round((avgGrade * 0.4 + submissionRate * 0.3 + quizAvg * 0.3));

      // Identify if student needs support (below 70%)
      const needsSupport = performanceScore < 70;

      return {
        id: student.id,
        name: student.fullName,
        email: student.email,
        avgGrade,
        submissionRate,
        quizAvg,
        performanceScore,
        needsSupport,
        gradeTrend: studentGrades.map(g => ({
          date: format(new Date(g.created_date || new Date()), 'MMM d'),
          score: g.score,
          type: g.assessmentType
        })).sort((a, b) => a.date.localeCompare(b.date))
      };
    });
  }, [students, grades, submissions, quizSubmissions, categories]);

  // Students needing support (sorted by lowest performance)
  const needsSupportList = useMemo(() => {
    return studentMetrics
      .filter(s => s.needsSupport)
      .sort((a, b) => a.performanceScore - b.performanceScore);
  }, [studentMetrics]);

  // Class overview metrics
  const classMetrics = useMemo(() => {
    if (studentMetrics.length === 0) return { avgPerformance: 0, supportCount: 0, topPerformers: [] };
    
    const avgPerformance = Math.round(
      studentMetrics.reduce((sum, s) => sum + s.performanceScore, 0) / studentMetrics.length
    );
    const supportCount = needsSupportList.length;
    const topPerformers = studentMetrics
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3);

    return { avgPerformance, supportCount, topPerformers };
  }, [studentMetrics, needsSupportList]);

  // Data for class performance trend
  const performanceTrendData = useMemo(() => {
    if (studentMetrics.length === 0) return [];
    
    return studentMetrics.map(s => ({
      name: s.name.split(' ')[0],
      grades: s.avgGrade,
      quizzes: s.quizAvg,
      submissions: s.submissionRate,
      overall: s.performanceScore
    }));
  }, [studentMetrics]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Progress Dashboard</h1>
          <p className="text-muted-foreground">Track student performance and identify support needs</p>
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Class Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Class Average</p>
              <p className="text-3xl font-bold text-primary">{classMetrics.avgPerformance}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Students</p>
              <p className="text-3xl font-bold">{studentMetrics.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Need Support</p>
              <p className={`text-3xl font-bold ${classMetrics.supportCount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                {classMetrics.supportCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Top Performers</p>
              <p className="text-3xl font-bold text-emerald-600">{classMetrics.topPerformers.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Class Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {studentMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overall" fill="#3b82f6" name="Overall Score" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No student data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classMetrics.topPerformers.length > 0 ? (
              classMetrics.topPerformers.map((student, idx) => (
                <div key={student.id} className="flex items-start gap-3 p-2 bg-emerald-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">Score: {student.performanceScore}%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Needing Support */}
      {classMetrics.supportCount > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-lg">Students Needing Support ({classMetrics.supportCount})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsSupportList.map(student => (
                <div key={student.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <Badge variant="destructive">Score: {student.performanceScore}%</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Avg Grade</p>
                      <p className="font-semibold">{student.avgGrade}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Submissions</p>
                      <p className="font-semibold">{student.submissionRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Quiz Score</p>
                      <p className="font-semibold">{student.quizAvg}%</p>
                    </div>
                  </div>

                  {student.gradeTrend.length > 0 && (
                    <div className="h-32 w-full bg-muted rounded p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={student.gradeTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    View Details & Provide Support
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Students Overview */}
      <Card>
        <CardHeader>
          <CardTitle>All Students Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {studentMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Student</th>
                    <th className="text-center p-2 font-medium">Overall</th>
                    <th className="text-center p-2 font-medium">Grades</th>
                    <th className="text-center p-2 font-medium">Submissions</th>
                    <th className="text-center p-2 font-medium">Quizzes</th>
                    <th className="text-center p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentMetrics.map(student => (
                    <tr key={student.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{student.name}</td>
                      <td className="p-2 text-center">
                        <span className={`font-semibold ${student.performanceScore >= 70 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {student.performanceScore}%
                        </span>
                      </td>
                      <td className="p-2 text-center">{student.avgGrade}%</td>
                      <td className="p-2 text-center">{student.submissionRate}%</td>
                      <td className="p-2 text-center">{student.quizAvg}%</td>
                      <td className="p-2 text-center">
                        {student.needsSupport ? (
                          <Badge variant="destructive" className="text-xs">Needs Support</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-emerald-50">On Track</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No students in this class</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}