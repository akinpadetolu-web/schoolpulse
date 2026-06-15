import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

export default function ReturnPanel({ borrows, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    borrowId: '',
    returnDate: new Date().toISOString().split('T')[0],
    condition: 'good',
    damageNotes: '',
  });

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!form.borrowId) {
      toast.error('Select a borrowing record');
      return;
    }

    setSaving(true);
    try {
      const borrow = borrows.find(b => b.id === form.borrowId);
      const returnDate = new Date(form.returnDate);
      const dueDate = new Date(borrow.dueDate);
      const daysLate = Math.max(0, Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24)));

      // Create return record
      await base44.entities.BookReturn.create({
        schoolId: user?.schoolId,
        bookBorrowId: form.borrowId,
        bookId: borrow.bookId,
        bookTitle: borrow.bookTitle,
        studentId: borrow.studentId,
        studentName: borrow.studentName,
        borrowDate: borrow.borrowDate,
        dueDate: borrow.dueDate,
        returnDate: form.returnDate,
        daysLate,
        condition: form.condition,
        damageNotes: form.damageNotes,
        returnedAt: new Date().toISOString(),
      });

      // Update borrow status
      await base44.entities.BookBorrow.update(form.borrowId, { status: 'returned' });

      // Create fine if overdue and condition is good
      if (daysLate > 0 && form.condition === 'good') {
        const finePerDay = 100; // NGN per day
        const fineAmount = daysLate * finePerDay;
        await base44.entities.BookFine.create({
          schoolId: user?.schoolId,
          bookId: borrow.bookId,
          bookTitle: borrow.bookTitle,
          studentId: borrow.studentId,
          studentName: borrow.studentName,
          fineType: 'overdue',
          daysLate,
          finePerDay,
          amount: fineAmount,
          reason: `Overdue by ${daysLate} day(s)`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }

      // Create damage fine if applicable
      if (form.condition !== 'good' && form.condition !== 'excellent') {
        const damageAmount = form.condition === 'poor' ? 5000 : form.condition === 'damaged' ? 3000 : 1000;
        await base44.entities.BookFine.create({
          schoolId: user?.schoolId,
          bookId: borrow.bookId,
          bookTitle: borrow.bookTitle,
          studentId: borrow.studentId,
          studentName: borrow.studentName,
          fineType: 'damage',
          amount: damageAmount,
          reason: `Book condition: ${form.condition}. ${form.damageNotes}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
      }

      toast.success('Book return processed');
      setForm({ borrowId: '', returnDate: new Date().toISOString().split('T')[0], condition: 'good', damageNotes: '' });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to process return');
    } finally {
      setSaving(false);
    }
  };

  const activeBorrows = borrows.filter(b => b.status === 'active');

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> Process Return</Button>
      </div>

      {activeBorrows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No active borrowing to return</div>
      ) : (
        <div className="grid gap-4">
          {activeBorrows.map(borrow => (
            <Card key={borrow.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{borrow.bookTitle}</h3>
                    <p className="text-sm text-muted-foreground">{borrow.studentName}</p>
                  </div>
                  <Badge variant="outline">Due: {borrow.dueDate}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Borrowed: {borrow.borrowDate}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Return Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Book Return</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProcessReturn} className="space-y-4">
            <div>
              <Label>Borrowing Record *</Label>
              <Select value={form.borrowId} onValueChange={v => setForm({ ...form, borrowId: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select record..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {borrows.filter(b => b.status === 'active').map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.bookTitle} - {b.studentName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Return Date</Label>
              <Input
                type="date"
                value={form.returnDate}
                onChange={e => setForm({ ...form, returnDate: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label>Book Condition</Label>
              <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.condition !== 'excellent' && form.condition !== 'good' && (
              <div>
                <Label>Damage Notes</Label>
                <Input
                  value={form.damageNotes}
                  onChange={e => setForm({ ...form, damageNotes: e.target.value })}
                  placeholder="Describe damage..."
                  disabled={saving}
                />
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Process Return
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}