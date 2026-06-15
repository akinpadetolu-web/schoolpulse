import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function SpecialNeedsPanel({ specialNeeds, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button><Plus className="w-4 h-4 mr-2" /> Add Special Needs Record</Button>
      </div>
      {specialNeeds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No special needs records</div>
      ) : (
        specialNeeds.map(record => (
          <Card key={record.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="font-semibold">{record.studentName}</p>
              <p className="text-sm text-muted-foreground capitalize">{record.needType.replace(/_/g, ' ')}</p>
              {record.description && <p className="text-xs mt-2">{record.description}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}