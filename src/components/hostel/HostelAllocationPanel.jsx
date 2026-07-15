import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export default function HostelAllocationPanel({ allocations, hostels, search, onRefresh, students }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    gender: 'male',
    className: '',
    classId: '',
    hostelId: '',
    bedNumber: '',
    roomNumber: '',
  });

  const genderFilter = user?.genderAccess;

  const eligibleStudents = useMemo(() => {
    let filtered = students || [];
    if (genderFilter && genderFilter !== 'all') {
      filtered = filtered.filter(s => (s.gender || '').toLowerCase() === genderFilter);
    }
    return filtered;
  }, [students, genderFilter]);

  const effectiveSearch = localSearch || search;
  const filteredAllocations = useMemo(() => {
    let filtered = allocations.filter(a =>
      a.studentName?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      a.hostelName?.toLowerCase().includes(effectiveSearch.toLowerCase())
    );
    if (genderFilter && genderFilter !== 'all') {
      filtered = filtered.filter(a => (a.gender || '').toLowerCase() === genderFilter);
    }
    return filtered;
  }, [allocations, effectiveSearch, genderFilter]);

  const handleSelectStudent = (studentId) => {
    const student = eligibleStudents.find(s => s.id === studentId);
    if (student) {
      setForm(prev => ({
        ...prev,
        studentId: student.id,
        studentName: student.fullName,
        gender: (student.gender || 'Male').toLowerCase(),
        className: student.className || '',
        classId: student.classId || '',
      }));
    }
  };

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.hostelId) {
      toast.error('Student and hostel are required');
      return;
    }

    setSaving(true);
    try {
      const hostel = hostels.find(h => h.id === form.hostelId);
      if (!hostel) {
        toast.error('Hostel not found');
        setSaving(false);
        return;
      }

      if (hostel.gender !== 'mixed' && form.gender !== hostel.gender) {
        toast.error(`This hostel is for ${hostel.gender} students only`);
        setSaving(false);
        return;
      }

      const existing = allocations.find(a => a.studentId === form.studentId && a.status === 'active');
      if (existing) {
        toast.error('Student is already allocated to a hostel');
        setSaving(false);
        return;
      }

      await base44.entities.HostelAllocation.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        gender: form.gender,
        classId: form.classId,
        className: form.className,
        hostelId: form.hostelId,
        hostelName: hostel.name,
        bedNumber: form.bedNumber,
        roomNumber: form.roomNumber,
        allocationDate: new Date().toISOString().split('T')[0],
        status: 'active',
        allocatedBy: user?.id,
        allocatedByName: user?.fullName,
        parentNotified: false,
      });

      const current = hostel.currentOccupancy || 0;
      await base44.entities.Hostel.update(form.hostelId, { currentOccupancy: current + 1 });

      await base44.entities.SchoolUser.update(form.studentId, {
        hostelId: form.hostelId,
        hostelName: hostel.name,
        hostelRoomNumber: form.roomNumber,
        hostelBedNumber: form.bedNumber,
      });

      toast.success('Student allocated to hostel');
      setForm({ studentId: '', studentName: '', gender: 'male', className: '', classId: '', hostelId: '', bedNumber: '', roomNumber: '' });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to allocate student');
    } finally {
      setSaving(false);
    }
  };

  const handleDeallocate = async (allocationId, hostelId, studentId) => {
    if (!window.confirm('Remove student from hostel?')) return;

    try {
      await base44.entities.HostelAllocation.update(allocationId, {
        status: 'inactive',
        deallocationDate: new Date().toISOString().split('T')[0],
        deallocationReason: 'Deallocated',
      });

      const hostel = hostels.find(h => h.id === hostelId);
      if (hostel) {
        const current = hostel.currentOccupancy || 0;
        await base44.entities.Hostel.update(hostelId, { currentOccupancy: Math.max(0, current - 1) });
      }

      if (studentId) {
        await base44.entities.SchoolUser.update(studentId, {
          hostelId: '',
          hostelName: '',
          hostelRoomNumber: '',
          hostelBedNumber: '',
        });
      }

      toast.success('Student deallocated');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to deallocate');
    }
  };

  const availableHostels = hostels.filter(h => {
    if (!h.isActive) return false;
    if (genderFilter && genderFilter !== 'all') {
      return h.gender === genderFilter || h.gender === 'mixed';
    }
    return true;
  });

  return (
    <>
      {filteredAllocations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground mb-4">No allocations</p>
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Allocate Student</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setShowDialog(true)} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Allocate Student</Button>
          </div>

          <div className="grid gap-4">
            {filteredAllocations.map(alloc => (
              <Card key={alloc.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold">{alloc.studentName}</h3>
                      <p className="text-sm text-muted-foreground">{alloc.hostelName} - Bed {alloc.bedNumber || 'TBD'}</p>
                      {alloc.className && <Badge variant="outline" className="text-xs mt-1">{alloc.className}</Badge>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeallocate(alloc.id, alloc.hostelId, alloc.studentId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p><span className="font-medium">Allocated:</span> {alloc.allocationDate}</p>
                    {alloc.roomNumber && <p><span className="font-medium">Room:</span> {alloc.roomNumber}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Student to Hostel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAllocation} className="space-y-4">
            <div>
              <Label>Student *</Label>
              <Select value={form.studentId} onValueChange={handleSelectStudent}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {eligibleStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName} - {s.className || 'No class'} ({s.gender || 'N/A'})
                    </SelectItem>
                  ))}
                  {eligibleStudents.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No students found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {form.studentName && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{form.studentName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium capitalize">{form.gender}</p>
                </div>
                {form.className && (
                  <div>
                    <p className="text-xs text-muted-foreground">Class</p>
                    <p className="text-sm font-medium">{form.className}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Hostel *</Label>
              <Select value={form.hostelId} onValueChange={v => setForm(prev => ({ ...prev, hostelId: v }))}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select hostel..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableHostels.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.capacity - (h.currentOccupancy || 0)} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bed Number</Label>
                <Input
                  value={form.bedNumber}
                  onChange={e => setForm(prev => ({ ...prev, bedNumber: e.target.value }))}
                  placeholder="Bed #"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Room Number</Label>
                <Input
                  value={form.roomNumber}
                  onChange={e => setForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                  placeholder="Room #"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Allocate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}