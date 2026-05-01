import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Clock } from 'lucide-react';
import { format, isToday } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminStaffAttendance() {
  const { schoolUser: user } = useSchoolAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadRecords();
    const unsubscribe = base44.entities.TimeClocking.subscribe(() => {
      loadRecords();
    });
    return unsubscribe;
  }, [filterDate]);

  async function loadRecords() {
    try {
      const data = await base44.entities.TimeClocking.filter({
        schoolId: user?.schoolId,
        date: filterDate,
      });
      setRecords((data || []).sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime)));
    } catch (err) {
      console.error('Failed to load clocking records:', err);
    }
    setLoading(false);
  }

  const filtered = records.filter(r =>
    r.staffName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clockedInCount = records.filter(r => r.status === 'clocked_in').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Attendance - Time Clocking</h1>
        <p className="text-muted-foreground">Monitor teacher clock-in/out records</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="md:w-40"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Clocked In</p>
            <p className="text-3xl font-bold mt-2">{clockedInCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Clocked Out</p>
            <p className="text-3xl font-bold mt-2">{records.filter(r => r.status === 'clocked_out').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Records Today</p>
            <p className="text-3xl font-bold mt-2">{records.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Records table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Clocking Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold">Staff Name</th>
                  <th className="text-left p-3 font-semibold">Role</th>
                  <th className="text-left p-3 font-semibold">Clock In</th>
                  <th className="text-left p-3 font-semibold">Clock Out</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map(record => {
                    const clockIn = new Date(record.clockInTime);
                    const clockOut = record.clockOutTime ? new Date(record.clockOutTime) : null;
                    const duration = clockOut
                      ? `${Math.round((clockOut - clockIn) / (1000 * 60))} min`
                      : 'Ongoing';

                    return (
                      <tr key={record.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{record.staffName}</td>
                        <td className="p-3 text-muted-foreground capitalize">{record.staffRole || 'N/A'}</td>
                        <td className="p-3">{format(clockIn, 'HH:mm:ss')}</td>
                        <td className="p-3">{clockOut ? format(clockOut, 'HH:mm:ss') : '—'}</td>
                        <td className="p-3">
                          <Badge className={record.status === 'clocked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                            {record.status === 'clocked_in' ? 'In' : 'Out'}
                          </Badge>
                        </td>
                        <td className="p-3">{duration}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}