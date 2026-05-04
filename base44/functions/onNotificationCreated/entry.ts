import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process parent notifications of specific types
    if (data.targetRole !== 'parent') {
      return Response.json({ success: true, message: 'Not a parent notification' });
    }

    const notificationType = data.type;
    const shouldSendPush = ['grade_updated', 'grade_alert', 'assignment'].includes(notificationType);

    if (!shouldSendPush) {
      return Response.json({ success: true, message: 'Notification type does not trigger push' });
    }

    // Send push notification asynchronously by invoking the push function
    try {
      await base44.asServiceRole.functions.invoke('sendPushNotifications', {
        notificationId: data.id
      });
    } catch (error) {
      // Log but don't fail - push is non-critical
      console.error('Failed to send push notification:', error.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notification handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});