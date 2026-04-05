import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2 } from 'lucide-react';

const CHILD_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', badge: 'bg-blue-500', text: 'text-blue-900' },
  { bg: 'bg-purple-100', border: 'border-purple-300', badge: 'bg-purple-500', text: 'text-purple-900' },
  { bg: 'bg-green-100', border: 'border-green-300', badge: 'bg-green-500', text: 'text-green-900' },
  { bg: 'bg-amber-100', border: 'border-amber-300', badge: 'bg-amber-500', text: 'text-amber-900' },
];

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function UnifiedTimetable({ children, timetable, loading }) {
  // Map timetable entries to children with color coding
  const coloredTimetable = useMemo(() => {
    return timetable.map(entry => {
      const childIndex = children.findIndex(c => c.classId === entry.classId);
      const color = CHILD_COLORS[childIndex % CHILD_COLORS.length];
      const childName = children[childIndex]?.fullName || 'Unknown';
      
      return {
        ...entry,
        childIndex,
        childName,
        color
      };
    });
  }, [timetable, children]);

  // Group by day
  const timetableByDay = useMemo(() => {
    const grouped = {};
    coloredTimetable.forEach(entry => {
      const day = entry.day || 'Unscheduled';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(entry);
    });
    
    // Sort days in logical order
    const sorted = {};
    DAYS_ORDER.forEach(day => {
      if (grouped[day]) sorted[day] = grouped[day];
    });
    
    // Add unscheduled if exists
    if (grouped['Unscheduled']) sorted['Unscheduled'] = grouped['Unscheduled'];
    
    return sorted;
  }, [coloredTimetable]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Combined Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading timetable...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (coloredTimetable.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Combined Timetable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No timetable entries available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Combined Timetable</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">All linked children's classes color-coded</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          {children.map((child, idx) => {
            const color = CHILD_COLORS[idx % CHILD_COLORS.length];
            return (
              <div key={child.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color.badge}`} />
                <span className="text-xs text-muted-foreground">{child.fullName}</span>
              </div>
            );
          })}
        </div>

        {/* Timetable by Day */}
        <div className="space-y-4">
          {Object.entries(timetableByDay).map(([day, entries]) => (
            <div key={day} className="space-y-2">
              <h3 className="font-semibold text-sm">{day}</h3>
              <div className="space-y-1">
                {entries.map(entry => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border-l-4 ${entry.color.bg} ${entry.color.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{entry.subjectName || 'Subject'}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.startTime || 'Time TBA'} {entry.endTime && `- ${entry.endTime}`}
                        </p>
                        {entry.room && (
                          <p className="text-xs text-muted-foreground">Room: {entry.room}</p>
                        )}
                      </div>
                      <Badge
                        className={`${entry.color.badge} text-white text-xs shrink-0`}
                        variant="secondary"
                      >
                        {entry.childName}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}