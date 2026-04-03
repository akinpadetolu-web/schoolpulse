import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.AuditLog.list('-created_date', 100);
        setLogs(data || []);
      } catch { setLogs([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      {logs.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No audit logs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy HH:mm') : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{(log.action || "").replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.schoolName || "—"}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.details || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.performedByName || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}