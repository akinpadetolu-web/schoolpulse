import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">School settings coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}