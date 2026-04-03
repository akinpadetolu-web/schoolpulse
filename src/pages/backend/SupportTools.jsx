import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function SupportTools() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Support Tools</h1>
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Support tools will be available here for troubleshooting and maintenance tasks.</p>
        </CardContent>
      </Card>
    </div>
  );
}