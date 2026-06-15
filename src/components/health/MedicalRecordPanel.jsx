import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function MedicalRecordPanel({ records, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button><Plus className="w-4 h-4 mr-2" /> Add Medical Record</Button>
      </div>
      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No medical records</div>
      ) : (
        records.map(record => (
          <Card key={record.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="font-semibold">{record.studentName}</p>
              {record.bloodGroup && <p className="text-sm">Blood: {record.bloodGroup}</p>}
              {record.allergies?.length > 0 && <p className="text-sm">Allergies: {record.allergies.join(', ')}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}