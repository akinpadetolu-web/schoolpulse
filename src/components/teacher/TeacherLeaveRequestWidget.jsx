import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

export default function TeacherLeaveRequestWidget() {
  const { schoolUser: user } = useSchoolAuth();
  const [leaves, setLeaves] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    loadLeaves();
    const unsubscribe = base44.entities.StaffLeave.subscribe((event) => {
      if (event.data?.staffId === user?.id) {
        loadLeaves();
      }
    });
    return unsubscribe;
  }, [user?.id]);

  async function loadLeaves() {
    if (!user?.id) return;
    try {
      const records = await base44.entities.StaffLeave.filter({
        schoolId: user.schoolId,
        staffId: user.id,
      });
      setLeaves((records || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (err) {
      console.error('Failed to load leaves:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) return;

    setLoading(true);
    try {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      await base44.entities.StaffLeave.create({
        schoolId: user.schoolId,
        staffId: user.id,
        staffName: user.fullName,
        staffRole: user.role,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        daysRequested,
        reason: formData.reason,
        status: 'pending',
      });

      setFormData({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      setOpen(false);
      await loadLeaves();
    } catch (err) {
      console.error('Failed to submit leave request:', err);
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;

  const statusColor = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          Leave Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground">Pending</p>
            <p className="font-semibold">{pendingCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Approved</p>
            <p className="font-semibold">{approvedCount}</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Leave of Absence</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Leave Type</label>
                <Select value={formData.leaveType} onValueChange={(value) => setFormData({...formData, leaveType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="maternity">Maternity</SelectItem>
                    <SelectItem value="paternity">Paternity</SelectItem>
                    <SelectItem value="compassionate">Compassionate</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Reason for leave request"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  className="h-20"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Recent requests */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {leaves.slice(0, 5).map(leave => (
            <div key={leave.id} className="text-xs border rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium capitalize">{leave.leaveType}</span>
                <Badge className={statusColor[leave.status]}>
                  {leave.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {format(new Date(leave.startDate), 'MMM d')} - {format(new Date(leave.endDate), 'MMM d')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}