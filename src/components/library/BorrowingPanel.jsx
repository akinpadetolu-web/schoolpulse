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

export default function BorrowingPanel({ borrows, books, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    studentName: '',
    bookId: '',
    borrowDate: new Date().toISOString().split('T')[0],
  });

  const handleCreateBorrow = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.bookId) {
      toast.error('Student and book are required');
      return;
    }

    setSaving(true);
    try {
      const book = books.find(b => b.id === form.bookId);
      if (!book || book.availableCopies < 1) {
        toast.error('Book not available');
        setSaving(false);
        return;
      }

      const borrowDate = new Date(form.borrowDate);
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + (book.borrowingPeriodDays || 14));

      await base44.entities.BookBorrow.create({
        schoolId: user?.schoolId,
        bookId: form.bookId,
        bookTitle: book.title,
        bookAuthor: book.author,
        studentId: form.studentId,
        studentName: form.studentName,
        borrowDate: form.borrowDate,
        dueDate: dueDate.toISOString().split('T')[0],
        borrowingPeriodDays: book.borrowingPeriodDays || 14,
        status: 'active',
        borrowedAt: new Date().toISOString(),
      });

      // Update book availability
      await base44.entities.Book.update(form.bookId, {
        availableCopies: book.availableCopies - 1,
        borrowedCopies: (book.borrowedCopies || 0) + 1,
      });

      toast.success('Book borrowed successfully');
      setForm({ studentId: '', studentName: '', bookId: '', borrowDate: new Date().toISOString().split('T')[0] });
      setShowDialog(false);
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to create borrowing record');
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async (borrowId, bookId, dueDate) => {
    try {
      const borrow = borrows.find(b => b.id === borrowId);
      if ((borrow?.renewalCount || 0) >= 2) {
        toast.error('Maximum renewals reached');
        return;
      }

      const newDueDate = new Date(dueDate);
      newDueDate.setDate(newDueDate.getDate() + 14);

      await base44.entities.BookBorrow.update(borrowId, {
        dueDate: newDueDate.toISOString().split('T')[0],
        renewalCount: (borrow?.renewalCount || 0) + 1,
        lastRenewedDate: new Date().toISOString().split('T')[0],
      });

      toast.success('Book renewed');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to renew');
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" /> New Borrowing</Button>
      </div>

      {borrows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No active borrowing records</div>
      ) : (
        <div className="grid gap-4">
          {borrows.map(borrow => (
            <Card key={borrow.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{borrow.bookTitle}</h3>
                    <p className="text-sm text-muted-foreground">{borrow.studentName}</p>
                  </div>
                  <Badge className={isOverdue(borrow.dueDate) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                    {borrow.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-3 space-y-1">
                  <p><span className="font-medium">Borrowed:</span> {borrow.borrowDate} • <span className="font-medium">Due:</span> {borrow.dueDate}</p>
                  {borrow.renewalCount > 0 && <p><span className="font-medium">Renewals:</span> {borrow.renewalCount}/2</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRenew(borrow.id, borrow.bookId, borrow.dueDate)}
                  disabled={borrow.renewalCount >= 2}
                >
                  Renew
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Borrowing Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Borrowing Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBorrow} className="space-y-4">
            <div>
              <Label>Student ID/Name *</Label>
              <Input
                value={form.studentId}
                onChange={e => setForm({ ...form, studentId: e.target.value })}
                placeholder="Student identifier"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Student Name</Label>
              <Input
                value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })}
                placeholder="Student full name"
                disabled={saving}
              />
            </div>
            <div>
              <Label>Book *</Label>
              <Select value={form.bookId} onValueChange={v => setForm({ ...form, bookId: v })}>
                <SelectTrigger disabled={saving}>
                  <SelectValue placeholder="Select book..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {books.filter(b => b.availableCopies > 0).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.title} ({b.availableCopies} available)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Borrow Date</Label>
              <Input
                type="date"
                value={form.borrowDate}
                onChange={e => setForm({ ...form, borrowDate: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Record
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}