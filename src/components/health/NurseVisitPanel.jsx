import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function NurseVisitPanel({ visits, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button><Plus className="w-4 h-4 mr-2" /> Log Visit</Button>
      </div>
      {visits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No nurse visits</div>
      ) : (
        visits.map(visit => (
          <Card key={visit.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="font-semibold">{visit.studentName}</p>
              <p className="text-sm text-muted-foreground">{visit.visitDate} - {visit.reason}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}