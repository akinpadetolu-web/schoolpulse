import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SpecialNeedsPanel({ specialNeeds, medicalRecords, search, onRefresh }) {
  const filtered = specialNeeds.filter(s =>
    s.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No special needs records</div>;
  }

  return (
    <div className="grid gap-4">
      {filtered.map(need => (
        <Card key={need.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold">{need.studentName}</h3>
                <p className="text-sm text-muted-foreground">{need.className}</p>
              </div>
              <Badge variant="outline">{need.needType.replace(/_/g, ' ')}</Badge>
            </div>
            {need.description && <p className="text-sm mb-2">{need.description}</p>}
            {need.accommodations?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Accommodations:</span> {need.accommodations.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}