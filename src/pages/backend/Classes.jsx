import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.SchoolClass.list('-created_date');
        setClasses(data || []);
      } catch { setClasses([]); }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = classes.filter(c =>
    (c.className || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.schoolName || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Classes</h1>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No classes found.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.className}</p>
                  <p className="text-sm text-muted-foreground">{c.schoolName || "—"} • {c.educationLevel === "junior" ? "Junior" : c.educationLevel === "senior" ? "Senior" : "—"} {c.academicTrack || ""}</p>
                </div>
                <Badge variant={c.isArchived ? "secondary" : "default"}>
                  {c.isArchived ? "Archived" : "Active"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}