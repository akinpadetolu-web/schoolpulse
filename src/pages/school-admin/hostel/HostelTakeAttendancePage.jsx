import React from 'react';
import { Loader2 } from 'lucide-react';
import { useHostelData } from '@/hooks/useHostelData';
import HostelDailyAttendance from '@/components/hostel/HostelDailyAttendance';

export default function HostelTakeAttendancePage() {
  const { allocations, hostels, attendance, loading, refresh } = useHostelData();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground">Record daily hostel attendance by session</p>
      </div>

      <HostelDailyAttendance
        allocations={allocations}
        hostels={hostels}
        attendance={attendance}
        onRefresh={refresh}
      />
    </div>
  );
}