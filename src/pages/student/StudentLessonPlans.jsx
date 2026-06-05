import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Target, Activity, Package, ChevronDown, ChevronUp, Calendar, FileText } from 'lucide-react';
import { format, isToday, isFuture, isPast, parseISO } from 'date-fns';

export default function StudentLessonPlans() {
  const user = getCurrentUser();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("upcoming");

  useEffect(() => {
    async function load() {
      const data = await base44.entities.LessonPlan.filter({
        schoolId: user?.schoolId,
        classId: user?.classId,
        isPublished: true,
        status: 'approved',
      });
      setPlans((data || []).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      setLoading(false);
    }
    load();

    // Subscribe to approved lesson updates
    const unsubscribe = base44.entities.LessonPlan.subscribe((event) => {
      if (event.data?.classId === user?.classId && event.data?.status === 'approved') {
        load();
      }
    });
    return () => unsubscribe();
  }, [user?.classId, user?.schoolId]);

  const filteredPlans = plans.filter(p => {
    if (!p.date) return true;
    const d = parseISO(p.date);
    if (filter === "upcoming") return isFuture(d) || isToday(d);
    if (filter === "past") return isPast(d) && !isToday(d);
    return true;
  });

  function dateLabel(dateStr) {
    if (!dateStr) return "";
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    return format(d, 'EEE, MMM d yyyy');
  }

  function dateBadgeColor(dateStr) {
    if (!dateStr) return "secondary";
    const d = parseISO(dateStr);
    if (isToday(d)) return "default";
    if (isFuture(d)) return "outline";
    return "secondary";
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Lesson Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upcoming lessons for {user?.className || "your class"}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPlans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No lesson plans available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Check back when your teachers publish upcoming lessons.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map(plan => {
            const isExpanded = expandedId === plan.id;
            const totalMins = (plan.activities || []).reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0);
            const d = plan.date ? parseISO(plan.date) : null;
            const todayHighlight = d && isToday(d);

            return (
              <Card key={plan.id} className={`border-0 shadow-sm ${todayHighlight ? 'ring-2 ring-primary/30' : ''}`}>
                <CardContent className="p-0">
                  {todayHighlight && (
                    <div className="px-4 pt-2.5 pb-0">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">📅 Today's Lesson</span>
                    </div>
                  )}
                  {/* Header */}
                  <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{plan.title}</p>
                        <Badge variant={dateBadgeColor(plan.date)} className="text-xs">{dateLabel(plan.date)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {plan.subjectName} · by {plan.teacherName}
                        {totalMins > 0 && <span className="ml-2">· {totalMins} min</span>}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-4 space-y-4">
                      {/* Objectives */}
                      {plan.objectives?.filter(o => o).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-primary" /> What you'll learn
                          </p>
                          <ul className="space-y-1.5">
                            {plan.objectives.filter(o => o).map((o, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Activities */}
                      {plan.activities?.filter(a => a.title).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-600" /> Lesson Activities
                          </p>
                          <div className="space-y-2">
                            {plan.activities.filter(a => a.title).map((a, i) => (
                              <div key={i} className="flex gap-3 p-3 bg-secondary/40 rounded-lg">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{a.title}</span>
                                    {a.durationMinutes && <span className="text-xs text-muted-foreground">{a.durationMinutes} min</span>}
                                  </div>
                                  {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources */}
                      {plan.resources?.filter(r => r).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-amber-600" /> What to bring
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {plan.resources.filter(r => r).map((r, i) => (
                              <span key={i} className="text-sm px-3 py-1 bg-amber-50 border border-amber-100 text-amber-800 rounded-full">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Homework */}
                      {plan.homework && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs font-semibold text-amber-700 mb-1">📝 Homework / Follow-up</p>
                          <p className="text-sm">{plan.homework}</p>
                        </div>
                      )}

                      {/* PDF Attachment */}
                      {plan.pdfFileUrl && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" /> Attached Notes
                          </p>
                          <a
                            href={plan.pdfFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-blue-700">View PDF Notes</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}