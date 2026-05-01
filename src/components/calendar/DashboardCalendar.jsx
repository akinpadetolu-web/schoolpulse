import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isToday, startOfDay, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function DashboardCalendar() {
  const { schoolUser: user } = useSchoolAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const allEvents = await base44.entities.SchoolEvent.filter({ schoolId: user?.schoolId });
      if (allEvents) {
        // Filter events visible to current user's role
        const roleEvents = (allEvents || []).filter(e => 
          (e.targetRoles || []).includes(user?.role) || (e.targetRoles || []).length === 0
        );
        // Filter by user's class if student/parent
        let filtered = roleEvents;
        if ((user?.role === 'student' || user?.role === 'parent') && user?.classId) {
          filtered = roleEvents.filter(e => 
            (e.targetClassIds || []).length === 0 || (e.targetClassIds || []).includes(user.classId)
          );
        }
        setEvents(filtered);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
    setLoading(false);
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const eventsByDate = {};
  events.forEach(e => {
    if (e.startDate) {
      const dateStr = format(new Date(e.startDate), 'yyyy-MM-dd');
      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
      eventsByDate[dateStr].push(e);
    }
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfWeek = days[0].getDay();
  const paddedDays = Array(firstDayOfWeek).fill(null).concat(days);

  const typeColors = {
    holiday: 'bg-red-100 text-red-700',
    exam: 'bg-blue-100 text-blue-700',
    parent_teacher_meeting: 'bg-purple-100 text-purple-700',
    school_event: 'bg-green-100 text-green-700',
    other: 'bg-gray-100 text-gray-700',
  };

  if (loading) return <Card className="border-0 shadow-sm"><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading calendar...</CardContent></Card>;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          School Calendar
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-32 text-center">{format(currentDate, 'MMM yyyy')}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateStr] || [];
            const isCurrentDay = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={dateStr}
                className={`aspect-square p-1.5 rounded-lg border text-center text-xs transition-colors ${
                  isCurrentDay
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-accent'
                } ${!isCurrentMonth ? 'opacity-40' : ''}`}
              >
                <div className="font-medium text-sm mb-1">{format(day, 'd')}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e, i) => (
                    <div
                      key={`${dateStr}-${i}`}
                      className={`text-xs rounded px-1 py-0.5 truncate ${typeColors[e.type] || typeColors.other}`}
                      title={e.title}
                    >
                      {e.title.substring(0, 8)}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming events */}
        {events.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Upcoming Events</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events
                .filter(e => new Date(e.startDate) >= startOfDay(new Date()))
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="text-xs">
                    <div className="flex items-start gap-2">
                      <Badge className={`flex-shrink-0 ${typeColors[e.type] || typeColors.other}`}>
                        {e.type.replace(/_/g, ' ')}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{e.title}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(e.startDate), 'MMM d')}
                          {e.endDate && e.endDate !== e.startDate ? ` - ${format(new Date(e.endDate), 'MMM d')}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              {events.filter(e => new Date(e.startDate) >= startOfDay(new Date())).length === 0 && (
                <p className="text-muted-foreground text-xs">No upcoming events</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}