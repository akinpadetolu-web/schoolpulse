import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const severityColor = {
  minor: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  severe: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function IncidentPanel({ incidents, medicalRecords, search, onRefresh }) {
  const filtered = incidents.filter(i =>
    i.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No incidents</div>;
  }

  return (
    <div className="grid gap-4">
      {filtered.map(incident => (
        <Card key={incident.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold">{incident.studentName}</h3>
                <p className="text-sm text-muted-foreground">{incident.incidentDate} - {incident.location}</p>
              </div>
              <Badge className={severityColor[incident.severity]}>{incident.severity}</Badge>
            </div>
            <p className="text-sm mb-2">{incident.description}</p>
            {incident.hospitalized && <p className="text-sm text-red-600 font-medium">⚠ Hospitalized</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}