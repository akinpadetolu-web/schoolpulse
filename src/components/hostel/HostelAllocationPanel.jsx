import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export default function HostelAllocationPanel({ allocations, hostels, search, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    gender: 'male',
    hostelId: '',
    bedNumber: '',
    roomNumber: '',
  });

  const filteredAllocations = allocations.filter(a =>
    a.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    a.hostelName?.toLowerCase().includes(search.toLowerCase())
  );

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

      await base44.entities.HostelAllocation.create({
        schoolId: user?.schoolId,
        studentId: form.studentId,
        studentName: form.studentName,
        gender: form.gender,
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

      // Update hostel occupancy
      const current = hostel.currentOccupancy || 0;
      await base44.entities.Hostel.update(form.hostelId, { currentOccupancy: current + 1 });

      toast.success('Student allocated to hostel');
      setForm({ studentId: '', studentName: '', gender: 'male', hostelId: '', bedNumber: '', roomNumber: '' });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to allocate student');
    } finally {
      setSaving(false);
    }
  };

  const handleDeallocate = async (allocationId, hostelId) => {
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

      toast.success('Student deallocated');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to deallocate');
    }
  };

  if (filteredAllocations.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground mb-4">No allocations</p>
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Allocate Student</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Allocate Student</Button>
      </div>

      <div className="grid gap-4">
        {filteredAllocations.map(alloc => (
          <Card key={alloc.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{alloc.studentName}</h3>
                  <p className="text-sm text-muted-foreground">{alloc.hostelName} - Bed {alloc.bedNumber || 'TBD'}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDeallocate(alloc.id, alloc.hostelId)}
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

      {/* Allocate Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Allocate Student to Hostel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAllocation} className="space-y-4">
            <div>
              <Label>Student ID *</Label>
              <Input
                value={form.studentId}
                onChange={e => setForm({ ...form, studentId: e.target.value })}
                placeholder="Student ID"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Student Name</Label>
              <Input
                value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })}
                placeholder="Full name"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hostel *</Label>
              <Select value={form.hostelId} onValueChange={v => setForm({ ...form, hostelId: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select hostel..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {hostels.filter(h => h.isActive).map(h => (
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
                  onChange={e => setForm({ ...form, bedNumber: e.target.value })}
                  placeholder="Bed #"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Room Number</Label>
                <Input
                  value={form.roomNumber}
                  onChange={e => setForm({ ...form, roomNumber: e.target.value })}
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