import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function StudentGrades() {
  const { schoolUser: user } = useSchoolAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Grade.filter({ schoolId: user?.schoolId, studentId: user?.id });
        setGrades(data || []);
      } catch { setGrades([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Grades</h1>
      {grades.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No grades recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead><TableHead>Comment</TableHead></TableRow></TableHeader>
            <TableBody>
              {grades.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.subjectName}</TableCell>
                  <TableCell className="capitalize">{g.assessmentType}</TableCell>
                  <TableCell>{g.score}/{g.maxScore}</TableCell>
                  <TableCell className="text-muted-foreground">{g.comment || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}