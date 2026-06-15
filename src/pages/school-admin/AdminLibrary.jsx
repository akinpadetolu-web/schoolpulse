import React, { useState, useEffect } from 'react';
import { useSchoolAuth } from '@/lib/SchoolAuthContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, BookOpen, Users, AlertTriangle, Wrench, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import BookCatalogPanel from '@/components/library/BookCatalogPanel';
import BorrowingPanel from '@/components/library/BorrowingPanel';
import ReturnPanel from '@/components/library/ReturnPanel';
import FineManagementPanel from '@/components/library/FineManagementPanel';
import RequestPanel from '@/components/library/RequestPanel';
import LibraryAnalytics from '@/components/library/LibraryAnalytics';

export default function AdminLibrary() {
  const { schoolUser: user } = useSchoolAuth();
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [returns, setReturns] = useState([]);
  const [fines, setFines] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Book.subscribe(event => {
      if (event.type === 'create' || event.type === 'update') loadData();
    });
    return unsub;
  }, []);

  async function loadData() {
    try {
      const [b, br, ret, f, req] = await Promise.all([
        base44.entities.Book.filter({ schoolId: user?.schoolId, isArchived: false }),
        base44.entities.BookBorrow.filter({ schoolId: user?.schoolId, status: { $in: ['active', 'overdue'] } }),
        base44.entities.BookReturn.filter({ schoolId: user?.schoolId }),
        base44.entities.BookFine.filter({ schoolId: user?.schoolId, status: { $in: ['pending', 'waived'] } }),
        base44.entities.BookRequest.filter({ schoolId: user?.schoolId, status: { $in: ['pending', 'approved'] } }),
      ]);
      setBooks(b || []);
      setBorrows(br || []);
      setReturns(ret || []);
      setFines(f || []);
      setRequests(req || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalBooks: books.length,
    availableBooks: books.reduce((sum, b) => sum + (b.availableCopies || 0), 0),
    activeLoans: borrows.filter(b => b.status === 'active').length,
    overdueBooks: borrows.filter(b => b.status === 'overdue').length,
    pendingFines: fines.filter(f => f.status === 'pending').length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library Management</h1>
          <p className="text-muted-foreground">Manage books, borrowing, and digital resources</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Books</div>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
            <p className="text-xs text-green-600 mt-1">{stats.availableBooks} available</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-4 h-4" /> Active Loans
            </div>
            <div className="text-2xl font-bold">{stats.activeLoans}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Overdue
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.overdueBooks}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Pending Fines</div>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingFines}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search books, students, or borrowing records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="catalog" className="w-full">
        <TabsList>
          <TabsTrigger value="catalog"><BookOpen className="w-4 h-4 mr-2" /> Catalog</TabsTrigger>
          <TabsTrigger value="borrowing"><Users className="w-4 h-4 mr-2" /> Borrowing ({stats.activeLoans})</TabsTrigger>
          <TabsTrigger value="returns">Returns ({returns.length})</TabsTrigger>
          <TabsTrigger value="fines">Fines ({stats.pendingFines})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({stats.pendingRequests})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog"><BookCatalogPanel books={books} search={search} onRefresh={loadData} /></TabsContent>
        <TabsContent value="borrowing"><BorrowingPanel borrows={borrows} books={books} onRefresh={loadData} /></TabsContent>
        <TabsContent value="returns"><ReturnPanel borrows={borrows} onRefresh={loadData} /></TabsContent>
        <TabsContent value="fines"><FineManagementPanel fines={fines} onRefresh={loadData} /></TabsContent>
        <TabsContent value="requests"><RequestPanel requests={requests} onRefresh={loadData} /></TabsContent>
        <TabsContent value="analytics"><LibraryAnalytics books={books} borrows={borrows} returns={returns} fines={fines} /></TabsContent>
      </Tabs>
    </div>
  );
}