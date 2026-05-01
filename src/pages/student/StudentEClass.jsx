import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Video, Clock, User } from 'lucide-react';
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns';

export default function StudentEClass() {
  const { schoolUser: user } = useSchoolAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.VirtualClass.filter({
          schoolId: user?.schoolId,
          classId: user?.classId,
        });
        setClasses((data || []).sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime)));
      } catch {
        setClasses([]);
      }
      setLoading(false);
    }
    load();

    const unsubscribe = base44.entities.VirtualClass.subscribe(() => load());
    return () => unsubscribe();
  }, [user?.schoolId, user?.classId]);

  const upcoming = classes.filter(c => isFuture(new Date(c.startDateTime)));
  const past = classes.filter(c => isPast(new Date(c.startDateTime)));

  const getCountdown = (startTime) => {
    const mins = differenceInMinutes(new Date(startTime), new Date());
    if (mins <= 0) return 'Starting now';
    if (mins < 60) return `Starts in ${mins}m`;
    const hours = Math.floor(mins / 60);
    return `Starts in ${hours}h ${mins % 60}m`;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">E-Class Sessions</h1>
        <p className="text-muted-foreground">Join live classes with your teachers</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming {upcoming.length > 0 && <Badge className="ml-2">{upcoming.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="past">Completed {past.length > 0 && <Badge className="ml-2">{past.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcoming.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No upcoming e-classes.</CardContent></Card>
          ) : (
            upcoming.map(cls => (
              <Card key={cls.id} className="border-0 shadow-sm ring-2 ring-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cls.title}</h3>
                        <Badge className="bg-primary text-xs">{getCountdown(cls.startDateTime)}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {cls.teacherName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                      </div>
                      {cls.description && <p className="text-sm mb-3">{cls.description}</p>}
                      <Button onClick={() => window.open(cls.meetLink, '_blank')} className="gap-2">
                        <Video className="w-4 h-4" /> Join Class
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {past.length === 0 ? (
            <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No completed e-classes yet.</CardContent></Card>
          ) : (
            past.map(cls => (
              <Card key={cls.id} className="border-0 shadow-sm opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{cls.title}</h3>
                        <Badge variant="secondary" className="text-xs">Completed</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {cls.teacherName}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(cls.startDateTime), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}