import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const reasonColor = {
  illness: 'bg-red-100 text-red-700',
  injury: 'bg-orange-100 text-orange-700',
  routine_checkup: 'bg-blue-100 text-blue-700',
  allergy_reaction: 'bg-purple-100 text-purple-700',
};

export default function NurseVisitPanel({ visits, medicalRecords, search, onRefresh }) {
  const filtered = visits.filter(v =>
    v.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No nurse visits</div>;
  }

  return (
    <div className="grid gap-4">
      {filtered.map(visit => (
        <Card key={visit.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold">{visit.studentName}</h3>
                <p className="text-sm text-muted-foreground">{visit.visitDate}</p>
              </div>
              <Badge className={reasonColor[visit.reason]}>{visit.reason.replace(/_/g, ' ')}</Badge>
            </div>
            {visit.diagnosis && <p className="text-sm"><span className="font-medium">Diagnosis:</span> {visit.diagnosis}</p>}
            {visit.temperature && <p className="text-sm text-muted-foreground">Temp: {visit.temperature}°C</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}