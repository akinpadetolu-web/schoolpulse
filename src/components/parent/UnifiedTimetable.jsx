import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import GridTimetable from '@/components/timetable/GridTimetable';

const CHILD_COLORS = [
  { bg: 'dark:bg-blue-900/30 bg-blue-50', border: 'dark:border-blue-700 border-blue-200', badge: 'bg-blue-600 dark:bg-blue-700', text: 'text-blue-950 dark:text-blue-100' },
  { bg: 'dark:bg-purple-900/30 bg-purple-50', border: 'dark:border-purple-700 border-purple-200', badge: 'bg-purple-600 dark:bg-purple-700', text: 'text-purple-950 dark:text-purple-100' },
  { bg: 'dark:bg-green-900/30 bg-green-50', border: 'dark:border-green-700 border-green-200', badge: 'bg-green-600 dark:bg-green-700', text: 'text-green-950 dark:text-green-100' },
  { bg: 'dark:bg-amber-900/30 bg-amber-50', border: 'dark:border-amber-700 border-amber-200', badge: 'bg-amber-600 dark:bg-amber-700', text: 'text-amber-950 dark:text-amber-100' },
];

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function UnifiedTimetable({ children, timetable, loading }) {
  const coloredTimetable = useMemo(() => {
    return timetable.map(entry => {
      const childIndex = children.findIndex(c => c.classId === entry.classId);
      const color = CHILD_COLORS[childIndex % CHILD_COLORS.length];
      const childName = children[childIndex]?.fullName || 'Unknown';
      return { ...entry, childIndex, childName, color };
    });
  }, [timetable, children]);

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
    <div className="space-y-6">
      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {children.map((child, idx) => {
              const color = CHILD_COLORS[idx % CHILD_COLORS.length];
              return (
                <div key={child.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color.badge}`} />
                  <span className="text-xs sm:text-sm font-medium text-foreground">{child.fullName}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Grid Timetables */}
      {children.length > 1 ? (
        children.map((child, childIdx) => {
          const childEntries = coloredTimetable.filter(e => e.childIndex === childIdx);
          return (
            <div key={child.id}>
              <h3 className="text-lg font-semibold mb-4">{child.fullName}'s Schedule</h3>
              <GridTimetable entries={childEntries} title="" />
            </div>
          );
        })
      ) : (
        <GridTimetable entries={coloredTimetable} title="Weekly Timetable" />
      )}
    </div>
  );
}