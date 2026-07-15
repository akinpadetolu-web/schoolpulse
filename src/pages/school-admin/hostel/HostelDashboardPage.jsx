import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useHostelData } from '@/hooks/useHostelData';
import HostelAnalytics from '@/components/hostel/HostelAnalytics';

export default function HostelDashboardPage() {
  const { hostels, allocations, attendance, stats, loading } = useHostelData();

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const statCards = [
    { label: 'Total Hostels', value: stats.totalHostels, color: '' },
    { label: 'Total Beds', value: stats.totalBeds, color: '' },
    { label: 'Occupied', value: stats.occupied, color: 'text-amber-600' },
    { label: 'Available', value: stats.available, color: 'text-green-600' },
    { label: 'Present Today', value: stats.todayPresent, color: '' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Hostel overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <HostelAnalytics hostels={hostels} allocations={allocations} attendance={attendance} />
    </div>
  );
}