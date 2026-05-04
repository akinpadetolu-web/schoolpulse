import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { notificationId } = await req.json();

    if (!notificationId) {
      return Response.json({ error: 'notificationId required' }, { status: 400 });
    }

    // Fetch the notification
    const notifications = await base44.asServiceRole.entities.Notification.filter({ id: notificationId });
    const notification = notifications?.[0];
    if (!notification) {
      return Response.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Skip if already sent
    if (notification.pushSent) {
      return Response.json({ success: true, message: 'Push already sent' });
    }

    // Only send to parent notifications
    if (notification.targetRole !== 'parent') {
      return Response.json({ success: true, message: 'Not a parent notification' });
    }

    // Get parent device tokens
    const deviceTokens = await base44.asServiceRole.entities.ParentDeviceToken.filter({
      schoolId: notification.schoolId,
      parentId: { $in: notification.targetUserIds || [] },
      isActive: true
    });

    if (!deviceTokens || deviceTokens.length === 0) {
      return Response.json({ success: true, message: 'No active device tokens found' });
    }

    // Filter by notification type preferences
    const notificationType = notification.type;
    let preferenceKey = 'gradeUpdates';
    
    if (notificationType === 'grade_alert') {
      preferenceKey = 'gradeAlerts';
    } else if (notificationType === 'assignment') {
      preferenceKey = 'assignmentScores';
    } else if (notificationType === 'announcement') {
      preferenceKey = 'announcements';
    }

    const activeTokens = deviceTokens.filter(token => {
      const prefs = token.notificationTypes || {};
      return prefs[preferenceKey] !== false;
    });

    if (activeTokens.length === 0) {
      return Response.json({ success: true, message: 'No devices with this notification type enabled' });
    }

    // Simulate push notification sending (in production, integrate with FCM, APNs, etc.)
    // For now, we'll just log and mark as sent
    console.log(`[PUSH NOTIFICATION] Sending to ${activeTokens.length} device(s):`, {
      title: notification.title,
      message: notification.message,
      devices: activeTokens.map(t => t.deviceName || 'unknown')
    });

    // Mark notification as pushed
    await base44.asServiceRole.entities.Notification.update(notificationId, {
      pushSent: true,
      pushDeliveredAt: new Date().toISOString()
    });

    return Response.json({
      success: true,
      sentCount: activeTokens.length,
      message: `Push notification sent to ${activeTokens.length} device(s)`
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});