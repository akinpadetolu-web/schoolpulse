import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherClockInWidget() {
  const { schoolUser: user } = useSchoolAuth();
  const [clockedIn, setClockedIn] = useState(false);
  const [todayClocking, setTodayClocking] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadTodayClocking();
  }, []);

  async function loadTodayClocking() {
    if (!user?.id) return;
    try {
      const records = await base44.entities.TimeClocking.filter({
        schoolId: user.schoolId,
        staffId: user.id,
        date: today,
      });
      if (records?.length > 0) {
        const record = records[0];
        setTodayClocking(record);
        setClockedIn(record.status === 'clocked_in');
      }
    } catch (err) {
      console.error('Failed to load clocking:', err);
    }
  }

  async function handleClockIn() {
    if (!user?.id) return;
    setLoading(true);
    try {
      await base44.entities.TimeClocking.create({
        schoolId: user.schoolId,
        staffId: user.id,
        staffName: user.fullName,
        date: today,
        clockInTime: new Date().toISOString(),
        status: 'clocked_in',
      });
      setClockedIn(true);
      await loadTodayClocking();
    } catch (err) {
      console.error('Clock in failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    if (!todayClocking?.id) return;
    setLoading(true);
    try {
      await base44.entities.TimeClocking.update(todayClocking.id, {
        clockOutTime: new Date().toISOString(),
        status: 'clocked_out',
      });
      setClockedIn(false);
      await loadTodayClocking();
    } catch (err) {
      console.error('Clock out failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Daily Clock In/Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className={clockedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
              {clockedIn ? 'Clocked In' : 'Not Clocked In'}
            </Badge>
          </div>
          {todayClocking?.clockInTime && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Clocked In</p>
              <p className="text-sm font-medium">{format(new Date(todayClocking.clockInTime), 'HH:mm')}</p>
            </div>
          )}
        </div>

        {todayClocking?.clockOutTime && (
          <div className="text-sm text-muted-foreground">
            <p>Clocked Out: {format(new Date(todayClocking.clockOutTime), 'HH:mm')}</p>
          </div>
        )}

        <div className="flex gap-2">
          {!clockedIn ? (
            <Button
              onClick={handleClockIn}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Clocking In...' : 'Clock In'}
            </Button>
          ) : (
            <Button
              onClick={handleClockOut}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? 'Clocking Out...' : 'Clock Out'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}