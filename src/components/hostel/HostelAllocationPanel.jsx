import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Users, Search, Pencil, ChevronDown, ChevronRight, BedDouble } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const EMPTY_FORM = {
  studentId: '',
  studentName: '',
  gender: 'male',
  className: '',
  classId: '',
  hostelId: '',
  bedNumber: '',
  roomNumber: '',
};

export default function HostelAllocationPanel({ allocations, hostels, search, onRefresh, students }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [expandedHostels, setExpandedHostels] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ hostelId: '', bedNumber: '', roomNumber: '' });

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
      a.hostelName?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (a.roomNumber || '').toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      (a.bedNumber || '').toLowerCase().includes(effectiveSearch.toLowerCase())
    );
    if (genderFilter && genderFilter !== 'all') {
      filtered = filtered.filter(a => (a.gender || '').toLowerCase() === genderFilter);
    }
    return filtered;
  }, [allocations, effectiveSearch, genderFilter]);

  // Group allocations by hostel name
  const groupedByHostel = useMemo(() => {
    const grouped = {};
    filteredAllocations.forEach(a => {
      const key = a.hostelName || 'Unassigned Hostel';
      if (!grouped[key]) grouped[key] = { hostelName: key, hostelId: a.hostelId, allocations: [] };
      grouped[key].allocations.push(a);
    });
    // Sort allocations within each hostel by room then bed
    Object.values(grouped).forEach(g => {
      g.allocations.sort((a, b) => {
        const rc = (a.roomNumber || 'ZZZ').localeCompare(b.roomNumber || 'ZZZ', undefined, { numeric: true });
        if (rc !== 0) return rc;
        return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true });
      });
    });
    return Object.values(grouped).sort((a, b) => a.hostelName.localeCompare(b.hostelName));
  }, [filteredAllocations]);

  const toggleHostel = (hostelName) => {
    setExpandedHostels(prev => ({ ...prev, [hostelName]: !prev[hostelName] }));
  };

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

      if (form.bedNumber && form.roomNumber) {
        const bedConflict = allocations.find(a =>
          a.status === 'active' &&
          a.hostelId === form.hostelId &&
          (a.roomNumber || '').trim().toLowerCase() === form.roomNumber.trim().toLowerCase() &&
          (a.bedNumber || '').trim().toLowerCase() === form.bedNumber.trim().toLowerCase()
        );
        if (bedConflict) {
          toast.error(`Bed ${form.bedNumber} in Room ${form.roomNumber} is already occupied by ${bedConflict.studentName}`);
          setSaving(false);
          return;
        }
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
      setForm(EMPTY_FORM);
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to allocate student');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (alloc) => {
    setEditingAlloc(alloc);
    setEditForm({
      hostelId: alloc.hostelId,
      bedNumber: alloc.bedNumber || '',
      roomNumber: alloc.roomNumber || '',
    });
    setShowEditDialog(true);
  };

  const handleEditAllocation = async (e) => {
    e.preventDefault();
    if (!editingAlloc) return;
    if (!editForm.hostelId) {
      toast.error('Hostel is required');
      return;
    }

    setSaving(true);
    try {
      const hostel = hostels.find(h => h.id === editForm.hostelId);
      if (!hostel) {
        toast.error('Hostel not found');
        setSaving(false);
        return;
      }

      if (hostel.gender !== 'mixed' && (editingAlloc.gender || '').toLowerCase() !== hostel.gender) {
        toast.error(`This hostel is for ${hostel.gender} students only`);
        setSaving(false);
        return;
      }

      // Bed conflict check — exclude the allocation being edited
      if (editForm.bedNumber && editForm.roomNumber) {
        const bedConflict = allocations.find(a =>
          a.id !== editingAlloc.id &&
          a.status === 'active' &&
          a.hostelId === editForm.hostelId &&
          (a.roomNumber || '').trim().toLowerCase() === editForm.roomNumber.trim().toLowerCase() &&
          (a.bedNumber || '').trim().toLowerCase() === editForm.bedNumber.trim().toLowerCase()
        );
        if (bedConflict) {
          toast.error(`Bed ${editForm.bedNumber} in Room ${editForm.roomNumber} is already occupied by ${bedConflict.studentName}`);
          setSaving(false);
          return;
        }
      }

      const oldHostelId = editingAlloc.hostelId;
      const movedHostels = oldHostelId !== editForm.hostelId;

      await base44.entities.HostelAllocation.update(editingAlloc.id, {
        hostelId: editForm.hostelId,
        hostelName: hostel.name,
        bedNumber: editForm.bedNumber,
        roomNumber: editForm.roomNumber,
      });

      // Update occupancy counts if hostel changed
      if (movedHostels) {
        const oldHostel = hostels.find(h => h.id === oldHostelId);
        if (oldHostel) {
          await base44.entities.Hostel.update(oldHostelId, {
            currentOccupancy: Math.max(0, (oldHostel.currentOccupancy || 0) - 1),
          });
        }
        const current = hostel.currentOccupancy || 0;
        await base44.entities.Hostel.update(editForm.hostelId, { currentOccupancy: current + 1 });
      }

      await base44.entities.SchoolUser.update(editingAlloc.studentId, {
        hostelId: editForm.hostelId,
        hostelName: hostel.name,
        hostelRoomNumber: editForm.roomNumber,
        hostelBedNumber: editForm.bedNumber,
      });

      toast.success('Allocation updated');
      setShowEditDialog(false);
      setEditingAlloc(null);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update allocation');
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
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by student, hostel, room or bed..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => setShowDialog(true)} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Allocate Student</Button>
      </div>

      {groupedByHostel.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">No allocations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByHostel.map(group => {
            const isExpanded = expandedHostels[group.hostelName] !== false; // default expanded
            return (
              <Card key={group.hostelId + group.hostelName} className="border-0 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleHostel(group.hostelName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm">{group.hostelName}</span>
                    <Badge variant="secondary" className="ml-1">{group.allocations.length} student{group.allocations.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">Click to {isExpanded ? 'collapse' : 'expand'}</span>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.allocations.map(alloc => (
                      <div key={alloc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-muted-foreground">
                            {alloc.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{alloc.studentName}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BedDouble className="w-3 h-3" />
                                Room {alloc.roomNumber || '—'} / Bed {alloc.bedNumber || '—'}
                              </span>
                              {alloc.className && <Badge variant="outline" className="text-xs">{alloc.className}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(alloc)}
                          >
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDeallocate(alloc.id, alloc.hostelId, alloc.studentId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Allocation</DialogTitle>
          </DialogHeader>
          {editingAlloc && (
            <form onSubmit={handleEditAllocation} className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Student</p>
                <p className="text-sm font-medium">{editingAlloc.studentName}</p>
                {editingAlloc.className && (
                  <Badge variant="outline" className="text-xs mt-1">{editingAlloc.className}</Badge>
                )}
              </div>

              <div>
                <Label>Hostel *</Label>
                <Select value={editForm.hostelId} onValueChange={v => setEditForm(prev => ({ ...prev, hostelId: v }))}>
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
                  <Label>Room Number</Label>
                  <Input
                    value={editForm.roomNumber}
                    onChange={e => setEditForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="Room #"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label>Bed Number</Label>
                  <Input
                    value={editForm.bedNumber}
                    onChange={e => setEditForm(prev => ({ ...prev, bedNumber: e.target.value }))}
                    placeholder="Bed #"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}