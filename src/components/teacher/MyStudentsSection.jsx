import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp } from 'lucide-react';

export default function MyStudentsSection({ teachingAssignments, students, grades, subjects, classes }) {
  const [filterSubject, setFilterSubject] = useState("all");

  // Get teacher's subjects and classes
  const assignedSubjectIds = [...new Set(teachingAssignments.map(a => a.subjectId))];
  const assignedClassIds = [...new Set(teachingAssignments.map(a => a.classId))];

  const relevantSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));
  const relevantClasses = classes.filter(c => assignedClassIds.includes(c.id));

  // Get students from assigned classes
  const myStudents = students.filter(s => assignedClassIds.includes(s.classId));

  // Group by subject
  const groupedBySubject = useMemo(() => {
    const groups = {};
    assignedSubjectIds.forEach(subjectId => {
      const subject = subjects.find(s => s.id === subjectId);
      const applicableClasses = (subject?.applicableClasses || []).filter(cid => assignedClassIds.includes(cid));
      const studentsInSubject = myStudents.filter(s => applicableClasses.includes(s.classId));

      if (studentsInSubject.length > 0) {
        groups[subjectId] = {
          subject,
          students: studentsInSubject.sort((a, b) => (a.className || '').localeCompare(b.className || '')),
        };
      }
    });
    return groups;
  }, [teachingAssignments, students, subjects, classes]);

  // Filter by subject if selected
  const displaySubjects = filterSubject === 'all'
    ? groupedBySubject
    : { [filterSubject]: groupedBySubject[filterSubject] };

  const calculateAverage = (studentId, subjectId) => {
    const studentGrades = grades.filter(g => g.studentId === studentId && g.subjectId === subjectId);
    if (studentGrades.length === 0) return null;
    const avg = Math.round(
      studentGrades.reduce((sum, g) => sum + ((g.score / (g.maxScore || 100)) * 100), 0) / studentGrades.length
    );
    return avg;
  };

  const getGradeColor = (avg) => {
    if (!avg) return 'text-muted-foreground';
    if (avg >= 70) return 'text-emerald-600';
    if (avg >= 60) return 'text-blue-600';
    if (avg >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  if (myStudents.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Users className="w-10 h-10 opacity-30" />
          <p>No students assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> My Students
        </h3>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {relevantSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {Object.entries(displaySubjects).map(([subjectId, { subject, students: subjectStudents }]) => (
          <Card key={subjectId} className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{subject.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subjectStudents.map(student => {
                  const avg = calculateAverage(student.id, subjectId);
                  const lastGrades = grades
                    .filter(g => g.studentId === student.id && g.subjectId === subjectId)
                    .sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0))
                    .slice(0, 1);

                  return (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{student.className}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {avg !== null && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className={`text-sm font-bold ${getGradeColor(avg)}`}>{avg}%</span>
                          </div>
                        )}
                        {lastGrades.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {lastGrades[0].assessmentType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(displaySubjects).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No students in this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
}