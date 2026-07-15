import React from 'react';
import { Loader2 } from 'lucide-react';
import { useHostelData } from '@/hooks/useHostelData';
import HostelAllocationPanel from '@/components/hostel/HostelAllocationPanel';

export default function HostelAllocationsPage() {
  const { allocations, hostels, students, loading, refresh } = useHostelData();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Allocations</h1>
        <p className="text-muted-foreground">Manage student bed and room assignments</p>
      </div>

      <HostelAllocationPanel
        allocations={allocations}
        hostels={hostels}
        search=""
        onRefresh={refresh}
        students={students}
      />
    </div>
  );
}