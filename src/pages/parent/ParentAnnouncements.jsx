import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Megaphone } from 'lucide-react';

export default function ParentAnnouncements() {
  const user = getCurrentUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Announcement.filter({ schoolId: user?.schoolId });
        // Parents see announcements targeted to "all" or "parent", filtered by their linked students' classes
        const linkedClassIds = (user?.linkedStudentIds || []).length > 0
          ? await base44.entities.SchoolUser.filter({ schoolId: user?.schoolId, role: "student" })
              .then(students => students.filter(s => (user.linkedStudentIds || []).includes(s.id)).map(s => s.classId).filter(Boolean))
          : [];

        setItems((data || []).filter(a => {
          if (a.targetRole === "all") return true;
          if (a.targetRole !== "parent") return false;
          if (a.targetClassIds && a.targetClassIds.length > 0) {
            // Show if any of the parent's linked students are in the targeted classes
            return linkedClassIds.some(cid => a.targetClassIds.includes(cid));
          }
          return true;
        }));
      } catch { setItems([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Announcements</h1>
      {items.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center"><Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No announcements.</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(a => (
            <Card key={a.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">By {a.authorName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}