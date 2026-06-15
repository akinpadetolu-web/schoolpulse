import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

const severityColor = {
  minor: 'bg-blue-100 text-blue-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
  critical: 'bg-destructive text-destructive-foreground',
};

export default function IncidentPanel({ incidents, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button><Plus className="w-4 h-4 mr-2" /> Report Incident</Button>
      </div>
      {incidents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No incidents reported</div>
      ) : (
        incidents.map(incident => (
          <Card key={incident.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{incident.studentName}</p>
                  <p className="text-sm text-muted-foreground">{incident.incidentDate} - {incident.incidentType}</p>
                </div>
                <Badge className={severityColor[incident.severity]}>{incident.severity}</Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}