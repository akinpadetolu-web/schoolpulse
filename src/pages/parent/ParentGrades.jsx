import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function ParentGrades() {
  const user = getCurrentUser();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const linkedIds = user?.linkedStudentIds || [];
        if (linkedIds.length > 0) {
          const all = await base44.entities.Grade.filter({ schoolId: user?.schoolId });
          setGrades((all || []).filter(g => linkedIds.includes(g.studentId)));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Children's Grades</h1>
      {grades.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No grades available.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.studentName}</TableCell>
                  <TableCell>{g.subjectName}</TableCell>
                  <TableCell className="capitalize">{g.assessmentType}</TableCell>
                  <TableCell>{g.score}/{g.maxScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}