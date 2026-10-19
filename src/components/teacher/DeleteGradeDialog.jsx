import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function DeleteGradeDialog({ grade, open, onOpenChange, onConfirm, saving }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Delete Grade
          </DialogTitle>
          <DialogDescription>
            {grade ? `${grade.studentName || 'Student'} · ${grade.subjectName || 'Subject'} · ${grade.score}/${grade.maxScore}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This grade will be permanently removed. A reason is required and is recorded in the grade change history.
          </p>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why is this grade being deleted?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={saving || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete Grade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}