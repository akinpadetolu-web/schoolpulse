import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, getColorForName } from '@/lib/avatarHelpers';

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const colorClass = getColorForName(user?.fullName || 'User');
  const initials = getInitials(user?.fullName);

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {user?.profilePictureUrl && (
        <AvatarImage src={user.profilePictureUrl} alt={user.fullName} />
      )}
      <AvatarFallback className={colorClass}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}