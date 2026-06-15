import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function HealthAnalytics({ records, visits, incidents, vaccinations, specialNeeds }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Medical Records</p>
          <p className="text-2xl font-bold">{records.length}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Nurse Visits</p>
          <p className="text-2xl font-bold">{visits.length}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Incidents</p>
          <p className="text-2xl font-bold text-red-600">{incidents.length}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Vaccinations</p>
          <p className="text-2xl font-bold">{vaccinations.length}</p>
        </CardContent>
      </Card>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Special Needs</p>
          <p className="text-2xl font-bold">{specialNeeds.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}