import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Megaphone, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getGradeLabel } from '@/lib/gradeMapper';

export default function ParentNotifications() {
  const { schoolUser: user } = useSchoolAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [gradeUpdates, setGradeUpdates] = useState([]);
  const [gradeLabels, setGradeLabels] = useState({});
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;
    async function load() {
      // Get linked students
      const allStudents = await base44.entities.SchoolUser.filter({
        schoolId: user.schoolId,
        role: 'student',
      });
      const myStudents = (allStudents || []).filter(s =>
        (user?.linkedStudentIds || []).includes(s.id)
      );
      setLinkedStudents(myStudents);

      // Get announcements
      const linkedClassIds = myStudents.map(s => s.classId).filter(Boolean);
      const ann = await base44.entities.Announcement.filter({
        schoolId: user.schoolId,
      });

      const filteredAnn = (ann || [])
        .filter(a => {
          if (!a.isPublished && a.isPublished !== undefined) return false;
          if (a.targetRole === 'all') return true;
          if (a.targetRole !== 'parent') return false;
          if (a.targetClassIds?.length > 0) {
            return linkedClassIds.some(cid => a.targetClassIds.includes(cid));
          }
          return true;
        })
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      // Get grades for all linked students
      const allGrades = await base44.entities.Grade.filter({
        schoolId: user.schoolId,
      });

      const studentGrades = (allGrades || [])
        .filter(g =>
          myStudents.map(s => s.id).includes(g.studentId) && g.score != null
        )
        .map(g => ({
          ...g,
          studentName: myStudents.find(s => s.id === g.studentId)?.fullName,
        }))
        .sort((a, b) => new Date(b.lastUpdatedAt || b.created_date) - new Date(a.lastUpdatedAt || a.created_date));

      setAnnouncements(filteredAnn);
      setGradeUpdates(studentGrades);
      setLoading(false);
    }
    load();
  }, [user?.schoolId, user?.linkedStudentIds]);

  // Resolve grade labels
  useEffect(() => {
    if (!user?.schoolId || !gradeUpdates.length) return;
    const percentages = new Set(
      gradeUpdates
        .filter(g => g.maxScore > 0)
        .map(g => Math.round((g.score / g.maxScore) * 100))
    );
    Promise.all([...percentages].map(async p => [p, await getGradeLabel(p, user.schoolId)]))
      .then(entries => setGradeLabels(Object.fromEntries(entries)));
  }, [gradeUpdates, user?.schoolId]);

  const getLabelForPct = (p) =>
    gradeLabels[p] || { label: '…', color: 'text-muted-foreground', bg: '' };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="text-sm text-muted-foreground -mt-2">
        Announcements and grade updates for your children
      </p>

      <Tabs defaultValue="announcements">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="announcements" className="flex items-center gap-1.5 text-xs">
            <Megaphone className="w-4 h-4" />
            <span>Announcements</span>
            {announcements.length > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px]">
                {announcements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-4 h-4" />
            <span>Grade Updates</span>
            {gradeUpdates.length > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px]">
                {gradeUpdates.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-4">
          {announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="w-12 h-12" />}
              message="No announcements yet."
            />
          ) : (
            <div className="grid gap-3">
              {announcements.map(a => (
                <Card key={a.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                      {a.targetRole && (
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 capitalize"
                        >
                          {a.targetRole}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {a.authorName} ·{' '}
                      {formatDistanceToNow(new Date(a.created_date), {
                        addSuffix: true,
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Grade Updates Tab */}
        <TabsContent value="grades" className="mt-4">
          {gradeUpdates.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-12 h-12" />}
              message="No grade updates yet."
            />
          ) : (
            <div className="grid gap-3">
              {gradeUpdates.map(g => {
                const pct =
                  g.maxScore > 0
                    ? Math.round((g.score / g.maxScore) * 100)
                    : null;
                const { label, color, bg } =
                  pct != null
                    ? getLabelForPct(pct)
                    : { label: null, color: '', bg: '' };
                return (
                  <Card key={g.id} className={`border-0 shadow-sm ${bg || ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">
                            {g.subjectName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.studentName} · {g.assessmentType}
                            {g.term ? ` · ${g.term}` : ''}
                          </p>
                          {g.comment && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{g.comment}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(g.lastUpdatedAt || g.created_date),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                        {pct != null && (
                          <div className="text-right shrink-0">
                            <p className={`text-xl font-bold ${color}`}>
                              {g.score}/{g.maxScore}
                            </p>
                            <p className={`text-xs font-semibold ${color}`}>
                              {pct}% · {label}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="py-12 text-center">
        <div className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50">
          {icon}
        </div>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}