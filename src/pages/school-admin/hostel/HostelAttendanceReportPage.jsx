import React from 'react';
import { Loader2 } from 'lucide-react';
import { useHostelData } from '@/hooks/useHostelData';
import HostelAttendanceReport from '@/components/hostel/HostelAttendanceReport';

export default function HostelAttendanceReportPage() {
  const { allocations, hostels, attendance, loading } = useHostelData();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance Report</h1>
        <p className="text-muted-foreground">Weekly trends and per-room attendance breakdown</p>
      </div>

      <HostelAttendanceReport
        allocations={allocations}
        hostels={hostels}
        attendance={attendance}
      />
    </div>
  );
}