import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentLibrary() {
  const { schoolUser: user } = useSchoolAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [requestingBook, setRequestingBook] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, search, category]);

  async function loadBooks() {
    try {
      const bks = await base44.entities.Book.filter({ schoolId: user?.schoolId });
      setBooks(bks || []);
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  function filterBooks() {
    let result = books.filter(b => b.availableCopies > 0 && !b.isArchived);

    if (search) {
      result = result.filter(b =>
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.author?.toLowerCase().includes(search.toLowerCase()) ||
        b.isbn?.includes(search)
      );
    }

    if (category !== 'all') {
      result = result.filter(b => b.category === category);
    }

    setFilteredBooks(result);
  }

  const handleRequestBook = async (book) => {
    setRequestingBook(book.id);
    setSubmitting(true);
    try {
      await base44.entities.BookRequest.create({
        schoolId: user?.schoolId,
        bookId: book.id,
        requestedTitle: book.title,
        requestedAuthor: book.author,
        requestedBy: user?.id,
        requestedByName: user?.fullName,
        requestType: 'book_availability',
        reason: `Student requesting to borrow ${book.title}`,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
      toast.success(`Request sent for "${book.title}"`);
      setRequestingBook(null);
    } catch (error) {
      toast.error('Failed to request book');
      setRequestingBook(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const categories = [...new Set(books.map(b => b.category))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">Browse and request books from the school library</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Available</p>
            <p className="text-2xl font-bold">{books.filter(b => b.availableCopies > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Copies</p>
            <p className="text-2xl font-bold">{books.reduce((sum, b) => sum + (b.totalCopies || 1), 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Borrowed</p>
            <p className="text-2xl font-bold text-amber-600">{books.reduce((sum, b) => sum + (b.borrowedCopies || 0), 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, or ISBN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Books */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">{search || category !== 'all' ? 'No books match your search' : 'No available books'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map(book => (
            <Card key={book.id} className="border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {book.coverImageUrl && (
                <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                  <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1 line-clamp-2">{book.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">{book.author}</p>

                {book.category && (
                  <Badge variant="outline" className="text-xs mb-3">{book.category.replace(/_/g, ' ')}</Badge>
                )}

                {book.isbn && (
                  <p className="text-xs text-muted-foreground mb-2">ISBN: {book.isbn}</p>
                )}

                <div className="space-y-2 mb-3 text-xs text-muted-foreground">
                  <p>Total: <span className="font-medium">{book.totalCopies || 1}</span></p>
                  <p>Available: <span className="font-medium text-green-600">{book.availableCopies}</span></p>
                </div>

                {book.borrowingPeriodDays && (
                  <p className="text-xs text-muted-foreground mb-3">Borrow for {book.borrowingPeriodDays} days</p>
                )}

                <Button
                  onClick={() => handleRequestBook(book)}
                  disabled={submitting || requestingBook === book.id}
                  className="w-full"
                  size="sm"
                >
                  {submitting && requestingBook === book.id ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <BookOpen className="w-3 h-3 mr-2" />
                  )}
                  Request Book
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}