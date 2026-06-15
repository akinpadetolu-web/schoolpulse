import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';

const categoryLabel = {
  fiction: 'Fiction',
  non_fiction: 'Non-Fiction',
  reference: 'Reference',
  textbook: 'Textbook',
  biography: 'Biography',
  history: 'History',
  science: 'Science',
  mathematics: 'Mathematics',
  languages: 'Languages',
  arts: 'Arts',
  technology: 'Technology',
  other: 'Other',
};

export default function BookCatalogPanel({ books, search, onRefresh }) {
  const { schoolUser: user } = useSchoolAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publicationYear: new Date().getFullYear(),
    category: 'fiction',
    resourceType: 'physical_book',
    description: '',
    totalCopies: 1,
    location: '',
    callNumber: '',
    purchaseDate: '',
    purchasePrice: '',
    borrowingPeriodDays: 14,
  });

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (book = null) => {
    if (book) {
      setSelectedBook(book);
      setForm({
        isbn: book.isbn || '',
        title: book.title,
        author: book.author,
        publisher: book.publisher || '',
        publicationYear: book.publicationYear || new Date().getFullYear(),
        category: book.category,
        resourceType: book.resourceType,
        description: book.description || '',
        totalCopies: book.totalCopies,
        location: book.location || '',
        callNumber: book.callNumber || '',
        purchaseDate: book.purchaseDate || '',
        purchasePrice: book.purchasePrice || '',
        borrowingPeriodDays: book.borrowingPeriodDays || 14,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.author) {
      toast.error('Title and author are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId: user?.schoolId,
        schoolName: user?.schoolName,
        ...form,
        totalCopies: Number(form.totalCopies),
        publicationYear: Number(form.publicationYear),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : 0,
        borrowingPeriodDays: Number(form.borrowingPeriodDays),
      };

      if (selectedBook?.id) {
        await base44.entities.Book.update(selectedBook.id, payload);
        toast.success('Book updated');
      } else {
        payload.availableCopies = payload.totalCopies;
        await base44.entities.Book.create(payload);
        toast.success('Book added');
      }

      onRefresh?.();
      setShowDialog(false);
      setSelectedBook(null);
    } catch (error) {
      toast.error('Failed to save book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await base44.entities.Book.update(deleteConfirm.id, { isArchived: true });
      toast.success('Book archived');
      onRefresh?.();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to archive book');
    }
  };

  if (filteredBooks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-muted-foreground mb-4">{books.length === 0 ? 'No books in catalog' : 'No matching books found'}</p>
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> Add Book</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => handleOpenDialog()}><Plus className="w-4 h-4 mr-2" /> Add Book</Button>
      </div>

      <div className="grid gap-4">
        {filteredBooks.map(book => (
          <Card key={book.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold">{book.title}</h3>
                    <Badge variant="outline" className="text-xs">{categoryLabel[book.category]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">By {book.author}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {book.isbn && <p><span className="font-medium">ISBN:</span> {book.isbn}</p>}
                    <p><span className="font-medium">Copies:</span> {book.availableCopies}/{book.totalCopies} available</p>
                    <p><span className="font-medium">Type:</span> {book.resourceType.replace(/_/g, ' ')} • <span className="font-medium">Location:</span> {book.location || 'N/A'}</p>
                    {book.description && <p className="italic text-xs mt-1">{book.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleOpenDialog(book)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(book)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBook?.id ? 'Edit Book' : 'Add Book to Catalog'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Book title"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Author *</Label>
                <Input
                  value={form.author}
                  onChange={e => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ISBN</Label>
                <Input
                  value={form.isbn}
                  onChange={e => setForm({ ...form, isbn: e.target.value })}
                  placeholder="ISBN-13"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Publisher</Label>
                <Input
                  value={form.publisher}
                  onChange={e => setForm({ ...form, publisher: e.target.value })}
                  placeholder="Publisher name"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiction">Fiction</SelectItem>
                    <SelectItem value="non_fiction">Non-Fiction</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="textbook">Textbook</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resource Type</Label>
                <Select value={form.resourceType} onValueChange={v => setForm({ ...form, resourceType: v })}>
                  <SelectTrigger disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_book">Physical Book</SelectItem>
                    <SelectItem value="digital_ebook">E-Book</SelectItem>
                    <SelectItem value="audiobook">Audiobook</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="magazine">Magazine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Publication Year</Label>
                <Input
                  type="number"
                  value={form.publicationYear}
                  onChange={e => setForm({ ...form, publicationYear: e.target.value })}
                  min={1900}
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Book summary..."
                className="resize-none h-20"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="Shelf location"
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Call Number</Label>
                <Input
                  value={form.callNumber}
                  onChange={e => setForm({ ...form, callNumber: e.target.value })}
                  placeholder="Library classification"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Total Copies</Label>
                <Input
                  type="number"
                  value={form.totalCopies}
                  onChange={e => setForm({ ...form, totalCopies: e.target.value })}
                  min={1}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Borrow Period (Days)</Label>
                <Input
                  type="number"
                  value={form.borrowingPeriodDays}
                  onChange={e => setForm({ ...form, borrowingPeriodDays: e.target.value })}
                  min={1}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  value={form.purchasePrice}
                  onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1">{selectedBook?.id ? 'Update Book' : 'Add Book'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Archive Book?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archive "{deleteConfirm?.title}"? This won't delete existing borrowing records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Archive</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { BookOpen } from 'lucide-react';