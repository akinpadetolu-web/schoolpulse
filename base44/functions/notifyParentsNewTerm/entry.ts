import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();

    // Triggered by entity automation — payload has event + data
    const termData = body?.data;

    if (!termData?.schoolId) {
      return Response.json({ error: 'Missing term data' }, { status: 400 });
    }

    const { schoolId, schoolName, name, academicYear, startDate, endDate } = termData;

    // Fetch all parents in this school
    const parents = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'parent',
      isArchived: false,
    });

    if (!parents || parents.length === 0) {
      return Response.json({ sent: 0, message: 'No parents found for this school' });
    }

    // Check if school has notification enabled
    const school = await base44.asServiceRole.entities.School.filter({ id: schoolId });
    const schoolData = school?.[0];
    if (schoolData && schoolData.notifyGradeUpdates === false) {
      return Response.json({ sent: 0, message: 'Email notifications disabled for this school' });
    }

    // Format dates nicely
    const fmt = (dateStr) => {
      if (!dateStr) return dateStr;
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formattedStart = fmt(startDate);
    const formattedEnd = fmt(endDate);

    // Create in-app notification for all parents in the school
    const notificationMessage = `New academic term "${name}" (${academicYear}) starts on ${formattedStart} and ends on ${formattedEnd}. Please ensure your child is prepared.`;

    try {
      const notification = await base44.asServiceRole.entities.Notification.create({
        schoolId,
        schoolName,
        type: 'announcement',
        title: `New Academic Term: ${name} (${academicYear})`,
        message: notificationMessage,
        targetRole: 'parent',
        targetUserIds: parents.map(p => p.id),
        createdByUser: 'system',
      });

      return Response.json({ 
        notified: parents.length, 
        message: `Notification sent to ${parents.length} parents`,
        notificationId: notification?.id 
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      return Response.json({ 
        error: 'Failed to notify parents',
        details: notificationError?.message 
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});