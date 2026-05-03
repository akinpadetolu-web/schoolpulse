import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schoolId } = await req.json();
    if (!schoolId) {
      return Response.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    const entries = await base44.asServiceRole.entities.TimetableEntry.filter({ schoolId });
    if (!entries || entries.length === 0) {
      return Response.json({ deleted: 0 });
    }

    await Promise.all(entries.map(e => base44.asServiceRole.entities.TimetableEntry.delete(e.id)));

    return Response.json({ deleted: entries.length });
  } catch (error) {
    console.error('Reset timetable error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});