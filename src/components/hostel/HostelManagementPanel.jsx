import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const genderColor = {
  male: 'bg-blue-100 text-blue-700',
  female: 'bg-pink-100 text-pink-700',
  mixed: 'bg-purple-100 text-purple-700',
};

export default function HostelManagementPanel({ hostels, search, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: 'male',
    type: 'boarding',
    capacity: 50,
    location: '',
    housemaster: '',
    housemasterName: '',
    housemasterPhone: '',
    facilities: '',
    monthlyFee: 0,
    checkInTime: '14:00',
    checkOutTime: '08:00',
  });

  const filteredHostels = hostels.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (hostel = null) => {
    if (hostel) {
      setSelectedHostel(hostel);
      setForm({
        name: hostel.name,
        gender: hostel.gender,
        type: hostel.type,
        capacity: hostel.capacity,
        location: hostel.location || '',
        housemaster: hostel.housemaster || '',
        housemasterName: hostel.housemasterName || '',
        housemasterPhone: hostel.housemasterPhone || '',
        facilities: (hostel.facilities || []).join(', '),
        monthlyFee: hostel.monthlyFee || 0,
        checkInTime: hostel.checkInTime || '14:00',
        checkOutTime: hostel.checkOutTime || '08:00',
      });
    }
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.capacity) {
      toast.error('Name and capacity are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        name: form.name,
        gender: form.gender,
        type: form.type,
        capacity: Number(form.capacity),
        location: form.location,
        housemaster: form.housemaster,
        housemasterName: form.housemasterName,
        housemasterPhone: form.housemasterPhone,
        facilities: form.facilities.split(',').map(f => f.trim()).filter(Boolean),
        monthlyFee: Number(form.monthlyFee),
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
      };

      if (selectedHostel?.id) {
        await base44.entities.Hostel.update(selectedHostel.id, payload);
        toast.success('Hostel updated');
      } else {
        await base44.entities.Hostel.create(payload);
        toast.success('Hostel created');
      }

      onRefresh?.();
      setShowDialog(false);
      setSelectedHostel(null);
    } catch (error) {
      toast.error('Failed to save hostel');
    } finally {
      setSaving(false);
    }
  };

  if (filteredHostels.length === 0) {
    return (
      <div className="text-center py-12">
        <Home className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground mb-4">{hostels.length === 0 ? 'No hostels' : 'No matching hostels'}</p>
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> Create Hostel</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> New Hostel</Button>
      </div>

      <div className="grid gap-4">
        {filteredHostels.map(hostel => (
          <Card key={hostel.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{hostel.name}</h3>
                    <Badge className={genderColor[hostel.gender]}>{hostel.gender}</Badge>
                    <Badge variant="outline">{hostel.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{hostel.location}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenDialog(hostel)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground grid grid-cols-2 gap-3 mb-3">
                <p><span className="font-medium">Capacity:</span> {hostel.capacity} beds</p>
                <p><span className="font-medium">Occupied:</span> {hostel.currentOccupancy || 0}</p>
                {hostel.housemasterName && <p className="col-span-2"><span className="font-medium">Housemaster:</span> {hostel.housemasterName}</p>}
                {hostel.monthlyFee && <p><span className="font-medium">Fee:</span> NGN {hostel.monthlyFee.toLocaleString()}/month</p>}
              </div>

              {hostel.facilities?.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Facilities:</span> {hostel.facilities.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedHostel?.id ? 'Edit Hostel' : 'Create Hostel'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hostel Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Boys Hostel A"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="Building/Area"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boarding">Boarding</SelectItem>
                    <SelectItem value="day_scholar">Day Scholar</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity *</Label>
                <Input
                  type="number"
                  value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: e.target.value })}
                  min={1}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Housemaster Name</Label>
                <Input
                  value={form.housemasterName}
                  onChange={e => setForm({ ...form, housemasterName: e.target.value })}
                  placeholder="Staff name"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Housemaster Phone</Label>
                <Input
                  value={form.housemasterPhone}
                  onChange={e => setForm({ ...form, housemasterPhone: e.target.value })}
                  placeholder="Phone number"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Time</Label>
                <Input
                  type="time"
                  value={form.checkInTime}
                  onChange={e => setForm({ ...form, checkInTime: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Check-out Time</Label>
                <Input
                  type="time"
                  value={form.checkOutTime}
                  onChange={e => setForm({ ...form, checkOutTime: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <Label>Monthly Fee (NGN)</Label>
              <Input
                type="number"
                value={form.monthlyFee}
                onChange={e => setForm({ ...form, monthlyFee: e.target.value })}
                placeholder="0"
                step="100"
                disabled={saving}
              />
            </div>

            <div>
              <Label>Facilities (comma-separated)</Label>
              <Input
                value={form.facilities}
                onChange={e => setForm({ ...form, facilities: e.target.value })}
                placeholder="e.g. Wifi, Hot water, Laundry service"
                disabled={saving}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {selectedHostel?.id ? 'Update Hostel' : 'Create Hostel'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </>
      );
      }