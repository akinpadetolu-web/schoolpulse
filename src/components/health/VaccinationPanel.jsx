import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColor = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  exempted: 'bg-gray-100 text-gray-700',
};

export default function VaccinationPanel({ vaccinations, medicalRecords, search, onRefresh }) {
  const filtered = vaccinations.filter(v =>
    v.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No vaccination records</div>;
  }

  return (
    <div className="grid gap-4">
      {filtered.map(vac => (
        <Card key={vac.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold">{vac.studentName}</h3>
                <p className="text-sm text-muted-foreground">{vac.vaccineName} - Dose {vac.doseNumber}</p>
              </div>
              <Badge className={statusColor[vac.status]}>{vac.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Date:</span> {vac.administrationDate}
              {vac.nextDueDate && ` | Next: ${vac.nextDueDate}`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}