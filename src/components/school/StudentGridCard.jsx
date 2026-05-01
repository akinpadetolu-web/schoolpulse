import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit2 } from 'lucide-react';

export default function StudentGridCard({ student, onView, onEdit }) {
  const initials = (student.fullName || 'S')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColors = [
    'bg-blue-100', 'bg-emerald-100', 'bg-purple-100',
    'bg-amber-100', 'bg-pink-100', 'bg-cyan-100',
  ];
  const bgColor = bgColors[initials.charCodeAt(0) % bgColors.length];

  return (
    <div className="rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="p-4 space-y-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center mx-auto`}>
          <span className="text-sm font-bold text-foreground">{initials}</span>
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="font-semibold text-sm line-clamp-2">{student.fullName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{student.username || 'No username'}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant={student.isArchived ? 'destructive' : 'default'} className="text-xs">
            {student.isArchived ? 'Inactive' : 'Active'}
          </Badge>
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
        </div>
      </div>
    </div>
  );
}