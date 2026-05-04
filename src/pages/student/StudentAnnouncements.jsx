import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Megaphone, Bell, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getGradeLabel } from '@/lib/gradeMapper';

export default function StudentAnnouncements() {
  const { schoolUser: user } = useSchoolAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [grades, setGrades] = useState([]);
  const [gradeLabels, setGradeLabels] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.schoolId) return;
    async function load() {
      const [ann, notifs, gradeList] = await Promise.all([
        base44.entities.Announcement.filter({ schoolId: user.schoolId }),
        base44.entities.Notification.filter({ schoolId: user.schoolId, targetRole: 'student' }),
        base44.entities.Grade.filter({ schoolId: user.schoolId, studentId: user.id }),
      ]);

      const filteredAnn = (ann || []).filter(a => {
        if (!a.isPublished && a.isPublished !== undefined) return false;
        if (a.targetRole === 'all') return true;
        if (a.targetRole !== 'student') return false;
        if (a.targetClassIds?.length > 0) return a.targetClassIds.includes(user.classId);
        return true;
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      const filteredNotifs = (notifs || []).filter(n => {
        if (n.targetUserIds?.length > 0) return n.targetUserIds.includes(user.id);
        if (n.targetClassIds?.length > 0) return n.targetClassIds.includes(user.classId);
        return true;
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      const sortedGrades = (gradeList || [])
        .filter(g => g.score != null)
        .sort((a, b) => new Date(b.lastUpdatedAt || b.created_date) - new Date(a.lastUpdatedAt || a.created_date));

      setAnnouncements(filteredAnn);
      setNotifications(filteredNotifs);
      setGrades(sortedGrades);
      setLoading(false);
    }
    load();
  }, [user?.schoolId, user?.id, user?.classId]);

  // Resolve grade labels
  useEffect(() => {
    if (!user?.schoolId || !grades.length) return;
    const percentages = new Set(
      grades.filter(g => g.maxScore > 0).map(g => Math.round((g.score / g.maxScore) * 100))
    );
    Promise.all([...percentages].map(async p => [p, await getGradeLabel(p, user.schoolId)]))
      .then(entries => setGradeLabels(Object.fromEntries(entries)));
  }, [grades, user?.schoolId]);

  const getLabelForPct = (p) => gradeLabels[p] || { label: '…', color: 'text-muted-foreground', bg: '' };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <Tabs defaultValue="announcements">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="announcements" className="flex items-center gap-1.5 text-xs">
            <Megaphone className="w-4 h-4" />
            <span>Announcements</span>
            {announcements.length > 0 && <Badge className="ml-1 h-4 px-1.5 text-[10px]">{announcements.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
            <Bell className="w-4 h-4" />
            <span>From Teachers</span>
            {notifications.length > 0 && <Badge className="ml-1 h-4 px-1.5 text-[10px]">{notifications.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-4 h-4" />
            <span>Grade Updates</span>
            {grades.length > 0 && <Badge className="ml-1 h-4 px-1.5 text-[10px]">{grades.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-4">
          {announcements.length === 0 ? (
            <EmptyState icon={<Megaphone className="w-12 h-12" />} message="No announcements yet." />
          ) : (
            <div className="grid gap-3">
              {announcements.map(a => (
                <Card key={a.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{a.title}</h3>
                      {a.targetRole && (
                        <Badge variant="outline" className="text-xs shrink-0 capitalize">{a.targetRole}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {a.authorName} · {formatDistanceToNow(new Date(a.created_date), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Teacher Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          {notifications.length === 0 ? (
            <EmptyState icon={<Bell className="w-12 h-12" />} message="No notifications from teachers." />
          ) : (
            <div className="grid gap-3">
              {notifications.map(n => (
                <Card key={n.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{n.title}</h3>
                      <Badge variant="outline" className="text-xs shrink-0 capitalize">{n.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Grade Updates Tab */}
        <TabsContent value="grades" className="mt-4">
          {grades.length === 0 ? (
            <EmptyState icon={<TrendingUp className="w-12 h-12" />} message="No grade updates yet." />
          ) : (
            <div className="grid gap-3">
              {grades.map(g => {
                const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : null;
                const { label, color, bg } = pct != null ? getLabelForPct(pct) : { label: null, color: '', bg: '' };
                return (
                  <Card key={g.id} className={`border-0 shadow-sm ${bg || ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{g.subjectName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{g.assessmentType} {g.term ? `· ${g.term}` : ''}</p>
                          {g.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{g.comment}"</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(g.lastUpdatedAt || g.created_date), { addSuffix: true })}
                          </p>
                        </div>
                        {pct != null && (
                          <div className="text-right shrink-0">
                            <p className={`text-xl font-bold ${color}`}>{g.score}/{g.maxScore}</p>
                            <p className={`text-xs font-semibold ${color}`}>{pct}% · {label}</p>
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
        <div className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50">{icon}</div>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}