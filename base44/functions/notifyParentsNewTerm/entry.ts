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

    // Format dates nicely
    const fmt = (dateStr) => {
      if (!dateStr) return dateStr;
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formattedStart = fmt(startDate);
    const formattedEnd = fmt(endDate);

    // Send email to each parent who has an email address
    const parentsWithEmail = parents.filter(p => p.email);
    let sent = 0;

    for (const parent of parentsWithEmail) {
      const subject = `New Academic Term Started: ${name} (${academicYear}) — ${schoolName}`;

      const body_html = `
Dear ${parent.fullName || 'Parent/Guardian'},

We are pleased to inform you that a new academic term has officially begun at ${schoolName}.

📚 Term Details:
  • Term Name:     ${name}
  • Academic Year: ${academicYear}
  • Start Date:    ${formattedStart}
  • End Date:      ${formattedEnd}

Please ensure your child is prepared for the new term. If you have any questions or concerns, do not hesitate to reach out to the school administration.

We wish your child a productive and successful term ahead.

Warm regards,
${schoolName} Administration
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: parent.email,
        subject,
        body: body_html,
      });

      sent++;
    }

    return Response.json({ sent, total: parentsWithEmail.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});