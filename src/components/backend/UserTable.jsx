import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, RotateCcw, Archive, KeyRound } from 'lucide-react';

export default function UserTable({ users, onResetPassword, onArchive, onRestore }) {
  if (!users || users.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No users found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.fullName || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{user.username || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
              <TableCell>
                <Badge variant={user.isArchived ? "secondary" : "default"}>
                  {user.isArchived ? "Archived" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onResetPassword && onResetPassword(user)}>
                      <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                    </DropdownMenuItem>
                    {user.isArchived ? (
                      <DropdownMenuItem onClick={() => onRestore && onRestore(user)}>
                        <RotateCcw className="w-4 h-4 mr-2" /> Restore
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onArchive && onArchive(user)} className="text-destructive">
                        <Archive className="w-4 h-4 mr-2" /> Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}