import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import CreateClassDialog from '@/components/backend/CreateClassDialog';

export default function AdminClasses() {
  const user = getCurrentUser();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.SchoolClass.filter({ schoolId: user?.schoolId });
      setClasses(data || []);
    } catch { setClasses([]); }
    setLoading(false);
  }

  const school = { id: user?.schoolId, schoolName: user?.schoolName };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Class</Button>
      </div>
      {classes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No classes yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-2">
          {classes.map(c => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.className}</p>
                  <p className="text-sm text-muted-foreground">{c.educationLevel === "junior" ? "Junior" : c.educationLevel === "senior" ? "Senior" : ""} {c.academicTrack || ""}</p>
                </div>
                <Badge variant={c.isArchived ? "secondary" : "default"}>{c.isArchived ? "Archived" : "Active"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <CreateClassDialog open={showCreate} onOpenChange={setShowCreate} school={school} onCreated={loadData} />
    </div>
  );
}