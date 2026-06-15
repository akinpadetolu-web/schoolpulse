import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LibraryAnalytics({ books, borrows, returns, fines }) {
  const analytics = useMemo(() => {
    // Category distribution
    const categoryCount = {};
    books.forEach(b => {
      categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
    });
    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

    // Borrowing trends (last 30 days)
    const borrowTrends = {};
    borrows.forEach(b => {
      const date = b.borrowDate;
      borrowTrends[date] = (borrowTrends[date] || 0) + 1;
    });
    const trendData = Object.entries(borrowTrends).sort().slice(-30).map(([date, count]) => ({ date, count }));

    // Most borrowed books
    const bookBorrowCount = {};
    borrows.forEach(b => {
      bookBorrowCount[b.bookTitle] = (bookBorrowCount[b.bookTitle] || 0) + 1;
    });
    const topBooks = Object.entries(bookBorrowCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // Resource type distribution
    const resourceCount = {};
    books.forEach(b => {
      const type = b.resourceType || 'physical_book';
      resourceCount[type] = (resourceCount[type] || 0) + 1;
    });
    const resourceData = Object.entries(resourceCount).map(([type, value]) => ({ type, value }));

    // Fine statistics
    const fineTotals = {
      pending: fines.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0),
      paid: fines.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0),
      waived: fines.filter(f => f.status === 'waived').reduce((sum, f) => sum + (f.amount || 0), 0),
    };

    return { categoryData, trendData, topBooks, resourceData, fineTotals };
  }, [books, borrows, returns, fines]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Borrows</div>
            <div className="text-2xl font-bold">{borrows.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Returned Books</div>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Fines Issued</div>
            <div className="text-2xl font-bold">NGN {(analytics.fineTotals.pending + analytics.fineTotals.paid + analytics.fineTotals.waived).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Books by Category */}
        {analytics.categoryData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Books by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={analytics.categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {analytics.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Resources by Type */}
        {analytics.resourceData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resources by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.resourceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Borrowing Trends */}
        {analytics.trendData.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Borrowing Trends (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Books */}
      {analytics.topBooks.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Borrowed Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topBooks.map((book, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-sm flex-1">{book.title}</span>
                  <Badge>{book.count} borrows</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fine Statistics */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fine Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-lg font-bold text-amber-600">NGN {analytics.fineTotals.pending.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Paid</p>
              <p className="text-lg font-bold text-green-600">NGN {analytics.fineTotals.paid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Waived</p>
              <p className="text-lg font-bold text-slate-600">NGN {analytics.fineTotals.waived.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}