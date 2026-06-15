import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Clock, User, AlertTriangle, Trash2, Plus, Edit } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import EClassDetailsDialog from '@/components/eclass/EClassDetailsDialog';

export default function AdminEClass() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [flagged, setFlagged] = useState({});
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEClass, setSelectedEClass] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.VirtualClass.filter({ schoolId: user?.schoolId });
        setClasses((data || []).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime)));
      } catch {
        setClasses([]);
      }
      setLoading(false);
    }
    load();

    const unsubscribe = base44.entities.VirtualClass.subscribe(() => load());
    return () => unsubscribe();
  }, [user?.schoolId]);

  const handleDelete = async () => {
    try {
      await base44.entities.VirtualClass.delete(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleFlag = (id) => {
    setFlagged(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const upcoming = classes.filter(c => isFuture(new Date(c.startDateTime)));
  const past = classes.filter(c => !isFuture(new Date(c.startDateTime)));
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const handleEditEClass = (eclass) => {
    setSelectedEClass(eclass);
    setDetailsDialogOpen(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.VirtualClass.filter({ schoolId: user?.schoolId });
      setClasses((data || []).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime)));
    } catch {
      setClasses([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E-Class Monitoring</h1>
          <p className="text-muted-foreground">Overview of all virtual class sessions</p>
        </div>
        <Button onClick={() => { setSelectedEClass(null); setDetailsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New E-Class
        </Button>
      </div>

      {flaggedCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-sm">{flaggedCount} e-class(es) marked for review</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming {upcoming.length > 0 && <Badge className="ml-2">{upcoming.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="past">Past {past.length > 0 && <Badge className="ml-2">{past.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No upcoming e-classes.</CardContent></Card>
          ) : (
            upcoming.map(cls => (
              <Card key={cls.id} className={`border-0 shadow-sm ${flagged[cls.id] ? 'ring-2 ring-destructive' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cls.title}</h3>
                        {flagged[cls.id] && <Badge variant="destructive" className="text-xs">Flagged for Review</Badge>}
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground mb-3">
                        <span><strong>Teacher:</strong> {cls.teacherName}</span>
                        <span><strong>Class:</strong> {cls.className} • <strong>Subject:</strong> {cls.subjectName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                        <a href={cls.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate">
                          {cls.meetLink}
                        </a>
                      </div>
                      <div className="flex gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => handleEditEClass(cls)}
                         >
                           <Edit className="w-4 h-4 mr-1" /> Edit
                         </Button>
                         <Button
                           size="sm"
                           variant={flagged[cls.id] ? 'default' : 'outline'}
                           onClick={() => toggleFlag(cls.id)}
                         >
                           <AlertTriangle className="w-4 h-4 mr-1" /> {flagged[cls.id] ? 'Unflag' : 'Flag for Review'}
                         </Button>
                         <Button
                           size="sm"
                           variant="destructive"
                           onClick={() => setDeleteConfirm(cls)}
                         >
                           <Trash2 className="w-4 h-4 mr-1" /> Delete
                         </Button>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No past e-classes.</CardContent></Card>
          ) : (
            past.map(cls => (
              <Card key={cls.id} className="border-0 shadow-sm opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold mb-1">{cls.title}</h3>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span><strong>Teacher:</strong> {cls.teacherName}</span>
                        <span><strong>Class:</strong> {cls.className}</span>
                        <span>{format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete E-Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* E-Class Details Dialog */}
      <EClassDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        eclass={selectedEClass}
        onSave={handleRefresh}
      />
    </div>
  );
}