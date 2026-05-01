/**
 * Notification Manager - Handles local and push notifications for offline alerts
 */

import { sendLocalNotification } from './pwaManager';

export const NotificationTypes = {
  GRADE_RECEIVED: 'grade_received',
  ASSIGNMENT_POSTED: 'assignment_posted',
  ECLASS_STARTING: 'eclass_starting',
  ANNOUNCEMENT: 'announcement',
  ATTENDANCE: 'attendance',
  SYNC_COMPLETE: 'sync_complete'
};

// Send grade received notification
export async function notifyGradeReceived(studentName, subjectName, grade) {
  await sendLocalNotification('New Grade Received', {
    body: `${studentName} received a ${grade} in ${subjectName}`,
    tag: NotificationTypes.GRADE_RECEIVED,
    requireInteraction: true,
    data: {
      type: NotificationTypes.GRADE_RECEIVED,
      studentName,
      subjectName,
      grade,
      url: '/grades'
    }
  });
}

// Send assignment posted notification
export async function notifyAssignmentPosted(className, assignmentTitle, dueDate) {
  await sendLocalNotification('New Assignment', {
    body: `${assignmentTitle} assigned to ${className}. Due: ${dueDate}`,
    tag: NotificationTypes.ASSIGNMENT_POSTED,
    requireInteraction: true,
    data: {
      type: NotificationTypes.ASSIGNMENT_POSTED,
      assignmentTitle,
      dueDate,
      url: '/assignments'
    }
  });
}

// Send eclass starting notification
export async function notifyEClassStarting(className, teacherName, minutesUntilStart) {
  await sendLocalNotification('E-Class Starting Soon', {
    body: `${teacherName}'s class starts in ${minutesUntilStart} minutes`,
    tag: NotificationTypes.ECLASS_STARTING,
    requireInteraction: true,
    data: {
      type: NotificationTypes.ECLASS_STARTING,
      className,
      teacherName,
      url: '/e-class'
    }
  });
}

// Send announcement notification
export async function notifyAnnouncement(schoolName, announcementTitle) {
  await sendLocalNotification('New Announcement', {
    body: `${schoolName}: ${announcementTitle}`,
    tag: NotificationTypes.ANNOUNCEMENT,
    data: {
      type: NotificationTypes.ANNOUNCEMENT,
      announcementTitle,
      url: '/announcements'
    }
  });
}

// Send attendance notification
export async function notifyAttendanceMarked(studentName, status, date) {
  await sendLocalNotification('Attendance Marked', {
    body: `${studentName} marked ${status} on ${date}`,
    tag: NotificationTypes.ATTENDANCE,
    data: {
      type: NotificationTypes.ATTENDANCE,
      studentName,
      status,
      url: '/attendance'
    }
  });
}

// Send sync complete notification
export async function notifySyncComplete(itemCount) {
  await sendLocalNotification('Data Synced', {
    body: `${itemCount} items synced successfully`,
    tag: NotificationTypes.SYNC_COMPLETE,
    data: {
      type: NotificationTypes.SYNC_COMPLETE
    }
  });
}

// Schedule periodic notifications for offline reminders
export function scheduleOfflineReminders() {
  if (!navigator.onLine) {
    // Show offline reminder every 30 minutes
    setInterval(() => {
      if (!navigator.onLine) {
        sendLocalNotification('Still Offline', {
          body: 'Your changes will sync when you reconnect to the internet',
          tag: 'offline_reminder',
          data: { type: 'offline_reminder' }
        }).catch(() => {});
      }
    }, 30 * 60 * 1000);
  }
}

// Send test notification (for debugging)
export async function sendTestNotification() {
  await sendLocalNotification('SchoolPulse Test Notification', {
    body: 'This is a test notification to verify notification support',
    tag: 'test_notification',
    data: { type: 'test_notification' }
  });
}

// Handle notification interaction
export function handleNotificationClick(data) {
  switch (data.type) {
    case NotificationTypes.GRADE_RECEIVED:
      window.location.href = '/grades';
      break;
    case NotificationTypes.ASSIGNMENT_POSTED:
      window.location.href = '/assignments';
      break;
    case NotificationTypes.ECLASS_STARTING:
      window.location.href = '/e-class';
      break;
    case NotificationTypes.ANNOUNCEMENT:
      window.location.href = '/announcements';
      break;
    case NotificationTypes.ATTENDANCE:
      window.location.href = '/attendance';
      break;
    default:
      window.location.href = '/';
  }
}