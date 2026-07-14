import React from 'react';
import TeacherClockInWidget from '@/components/teacher/TeacherClockInWidget';
import TeacherLeaveRequestWidget from '@/components/teacher/TeacherLeaveRequestWidget';

export default function TeacherClockInOut() {
  return (
    <div className="p-4 md:p-0 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Clock In / Out</h1>
      <p className="text-muted-foreground mb-6">Track your daily work hours</p>
      <TeacherClockInWidget />
      <div className="mt-6">
        <TeacherLeaveRequestWidget />
      </div>
    </div>
  );
}