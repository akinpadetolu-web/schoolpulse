import { createClient } from 'npm:@base44/sdk@0.8.25';

const base44 = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, termId, payload, schoolId } = body;

    if (action === 'list') {
      const terms = await base44.asServiceRole.entities.AcademicTerm.filter({ schoolId });
      return Response.json({ terms: terms || [] });
    }

    if (action === 'create') {
      const term = await base44.asServiceRole.entities.AcademicTerm.create(payload);
      return Response.json({ term });
    }

    if (action === 'update') {
      const term = await base44.asServiceRole.entities.AcademicTerm.update(termId, payload);
      return Response.json({ term });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.AcademicTerm.delete(termId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});