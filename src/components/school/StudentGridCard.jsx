import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit2, KeyRound } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

export default function StudentGridCard({ student, onView, onEdit, onReset }) {
  return (
    <div className="rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="p-4 space-y-3">
        {/* Avatar */}
        <div className="flex justify-center">
          <UserAvatar user={student} size="lg" />
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="font-semibold text-sm line-clamp-2">{student.fullName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{student.username || 'No username'}</p>
        </div>

        {/* Status + Gender Badges */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          <Badge variant={student.isArchived ? 'destructive' : 'default'} className="text-xs">
            {student.isArchived ? 'Inactive' : 'Active'}
          </Badge>
          {student.gender && (
            <Badge variant="outline" className={`text-xs ${student.gender === 'Female' ? 'border-pink-300 text-pink-600' : 'border-blue-300 text-blue-600'}`}>
              {student.gender}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onView(student)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onEdit(student)}
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          {onReset && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="px-2">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onReset(student)}>
                  <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}