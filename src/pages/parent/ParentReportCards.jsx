import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Loader } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentReportCards() {
  const { schoolUser: user } = useSchoolAuth();
  const [reportCards, setReportCards] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    try {
      setLoading(true);
      const linkedIds = user?.linkedStudentIds || [];
      
      if (linkedIds.length === 0) {
        setReportCards([]);
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch all report cards for linked students
      const allCards = await base44.entities.ReportCard.filter({ schoolId: user?.schoolId });
      const filtered = (allCards || []).filter(rc => linkedIds.includes(rc.studentId));
      
      // Fetch student details
      const studentsList = await base44.entities.SchoolUser.filter({ 
        schoolId: user?.schoolId, 
        role: 'student' 
      });
      const linkedStudents = (studentsList || []).filter(s => linkedIds.includes(s.id));

      setReportCards(filtered.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate)));
      setStudents(linkedStudents);
    } catch (err) {
      console.error('Failed to load report cards:', err);
      toast.error('Failed to load report cards');
    } finally {
      setLoading(false);
    }
  }

  const getStudentName = (studentId) => {
    return students.find(s => s.id === studentId)?.fullName || 'Unknown Student';
  };

  async function handleDownload(cardId) {
    try {
      setDownloading(cardId);
      const response = await base44.functions.invoke('downloadReportCard', { reportCardId: cardId });
      
      // Create blob from response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${cardId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report card downloaded');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download report card');
    } finally {
      setDownloading(null);
    }
  }

  const statusColor = {
    draft: 'bg-slate-100 text-slate-700',
    generated: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    sent: 'bg-purple-100 text-purple-700'
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reportCards.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Report Cards Yet</h3>
        <p className="text-muted-foreground">Report cards will appear here once your child's school sends them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Report Cards</h1>
        <p className="text-muted-foreground">View and download your child's report cards</p>
      </div>

      <div className="grid gap-4">
        {reportCards.map(card => (
          <Card key={card.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">{card.period}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{getStudentName(card.studentId)}</p>
                </div>
                <Badge className={statusColor[card.status] || statusColor.generated}>
                  {card.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {card.overallAverage !== undefined && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Overall Average</p>
                    <p className="text-lg font-semibold">{Math.round(card.overallAverage)}%</p>
                  </div>
                )}
                {card.overallLetterGrade && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Grade</p>
                    <p className="text-lg font-semibold">{card.overallLetterGrade}</p>
                  </div>
                )}
                {card.attendanceRate !== undefined && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="text-lg font-semibold">{Math.round(card.attendanceRate)}%</p>
                  </div>
                )}
              </div>

              {/* Subject Grades */}
              {card.subjectGrades && card.subjectGrades.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Subject Grades</p>
                  <div className="space-y-1">
                    {card.subjectGrades.map((sg, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <span className="font-medium">{sg.subjectName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{Math.round(sg.weightedAverage)}%</span>
                          <Badge variant="outline" className="text-xs">{sg.letterGrade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {card.teacherComment && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Teacher Comment</p>
                  <p className="text-sm p-2 rounded bg-muted/30 italic">{card.teacherComment}</p>
                </div>
              )}

              {/* Dates and Actions */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div>
                  <span>Generated: {new Date(card.generatedDate).toLocaleDateString()}</span>
                  {card.sentDate && <span className="ml-3">Sent: {new Date(card.sentDate).toLocaleDateString()}</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(card.id)}
                  disabled={downloading === card.id}
                >
                  {downloading === card.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}