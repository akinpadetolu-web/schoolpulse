import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

const statusColor = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  exempted: 'bg-slate-100 text-slate-700',
};

export default function VaccinationPanel({ vaccinations, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button><Plus className="w-4 h-4 mr-2" /> Record Vaccination</Button>
      </div>
      {vaccinations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No vaccination records</div>
      ) : (
        vaccinations.map(vac => (
          <Card key={vac.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{vac.studentName}</p>
                  <p className="text-sm text-muted-foreground">{vac.vaccineName} - Dose {vac.doseNumber}</p>
                  <p className="text-xs text-muted-foreground mt-1">{vac.administrationDate}</p>
                </div>
                <Badge className={statusColor[vac.status]}>{vac.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}