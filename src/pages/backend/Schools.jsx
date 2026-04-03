import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, ChevronRight } from 'lucide-react';
import CreateSchoolDialog from '@/components/backend/CreateSchoolDialog';

export default function Schools() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadSchools(); }, []);

  async function loadSchools() {
    setLoading(true);
    try {
      const data = await base44.entities.School.list('-created_date');
      setSchools(data || []);
    } catch { setSchools([]); }
    setLoading(false);
  }

  const filtered = schools.filter(s =>
    (s.schoolName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.schoolCode || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add School
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No schools found. Click "Add School" to create one.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(school => (
            <Card
              key={school.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/backend/schools/${school.id}`)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {(school.schoolCode || "?").slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{school.schoolName}</p>
                    <p className="text-sm text-muted-foreground">{school.schoolCode} {school.address ? `• ${school.address}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={school.isActive ? "default" : "secondary"}>
                    {school.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSchoolDialog open={showCreate} onOpenChange={setShowCreate} onCreated={loadSchools} />
    </div>
  );
}