import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const priorityColor = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function RequestPanel({ requests, onRefresh }) {
  const [updating, setUpdating] = useState(null);

  const handleStatusUpdate = async (requestId, newStatus) => {
    setUpdating(requestId);
    try {
      const updates = { status: newStatus };
      if (newStatus === 'approved') {
        updates.approvedAt = new Date().toISOString();
      }
      await base44.entities.BookRequest.update(requestId, updates);
      toast.success('Request updated');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to update request');
    } finally {
      setUpdating(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  if (requests.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No book requests</div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900"><span className="font-bold">Pending Requests:</span> {pendingRequests.length}</p>
      </div>

      <div className="grid gap-4">
        {requests.map(req => (
          <Card key={req.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{req.requestedTitle}</h3>
                  {req.requestedAuthor && <p className="text-sm text-muted-foreground">By {req.requestedAuthor}</p>}
                </div>
                <div className="flex gap-2">
                  <Badge className={priorityColor[req.priority]}>{req.priority}</Badge>
                  <Badge variant="outline">{req.status}</Badge>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-3 space-y-1">
                <p><span className="font-medium">Requested by:</span> {req.requestedByName}</p>
                <p><span className="font-medium">Type:</span> {req.requestType.replace(/_/g, ' ')}</p>
                {req.reason && <p><span className="font-medium">Reason:</span> {req.reason}</p>}
              </div>

              {req.status === 'pending' && (
                <Select value={req.status} onValueChange={v => handleStatusUpdate(req.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs" disabled={updating === req.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approve</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}