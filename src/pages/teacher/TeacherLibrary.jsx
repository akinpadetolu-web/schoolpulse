import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherLibrary() {
  const { schoolUser: user } = useSchoolAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

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
    let result = books.filter(b => !b.isArchived);

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

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const categories = [...new Set(books.map(b => b.category))].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">School Library</h1>
        <p className="text-muted-foreground">Browse and explore the school library collection</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Books</p>
            <p className="text-2xl font-bold">{books.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Available Copies</p>
            <p className="text-2xl font-bold text-green-600">{books.reduce((sum, b) => sum + (b.availableCopies || 0), 0)}</p>
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

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">{search || category !== 'all' ? 'No books match your search' : 'No books available'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBooks.map(book => (
            <Card key={book.id} className="border-0 shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
              {/* Book Cover */}
              <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
                {book.coverImageUrl ? (
                  <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Book Info */}
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{book.title}</h3>
                <p className="text-xs text-muted-foreground mb-2">{book.author}</p>

                {book.category && (
                  <Badge variant="outline" className="text-xs mb-2">{book.category.replace(/_/g, ' ')}</Badge>
                )}

                <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                  {book.availableCopies > 0 ? (
                    <p className="text-green-600 font-medium">{book.availableCopies} available</p>
                  ) : (
                    <p className="text-red-600 font-medium">Not available</p>
                  )}
                  {book.borrowingPeriodDays && (
                    <p>Borrow: {book.borrowingPeriodDays} days</p>
                  )}
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}