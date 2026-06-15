import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { planId } = await req.json();
    if (!planId) return Response.json({ error: 'Plan ID required' }, { status: 400 });

    const plan = await base44.entities.LessonPlan.get(planId);
    if (!plan) return Response.json({ error: 'Plan not found' }, { status: 404 });

    // Generate PDF
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 40;
    const maxW = pageW - margin * 2;
    let yPos = 60;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(plan.title || 'Lesson Plan', margin, yPos);
    yPos += 25;

    // Metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const metadata = [
      `Subject: ${plan.subjectName || 'N/A'}`,
      `Class: ${plan.className || 'N/A'}`,
      `Teacher: ${plan.teacherName || 'N/A'}`,
      `Date: ${plan.date || 'N/A'}`,
    ];
    metadata.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 15;
    });
    yPos += 10;

    // Learning Objectives
    if (plan.objectives?.filter(o => o).length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Learning Objectives', margin, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      plan.objectives.filter(o => o).forEach(obj => {
        const lines = doc.splitTextToSize(`• ${obj}`, maxW);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 12 + 5;
        if (yPos > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          yPos = 40;
        }
      });
      yPos += 10;
    }

    // Activities
    if (plan.activities?.filter(a => a.title).length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Activities', margin, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      plan.activities.filter(a => a.title).forEach((act, idx) => {
        doc.setFont('helvetica', 'bold');
        const title = `${idx + 1}. ${act.title}${act.durationMinutes ? ` (${act.durationMinutes} min)` : ''}`;
        doc.text(title, margin, yPos);
        yPos += 12;

        if (act.description) {
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(act.description, maxW - 20);
          doc.text(lines, margin + 10, yPos);
          yPos += lines.length * 10 + 5;
        }
        yPos += 5;

        if (yPos > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          yPos = 40;
        }
      });
      yPos += 10;
    }

    // Resources
    if (plan.resources?.filter(r => r).length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resources', margin, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      plan.resources.filter(r => r).forEach(res => {
        const lines = doc.splitTextToSize(`• ${res}`, maxW);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 10 + 5;
      });
      yPos += 10;
    }

    // Homework
    if (plan.homework) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Homework', margin, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(plan.homework, maxW);
      doc.text(lines, margin, yPos);
    }

    // Return PDF
    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${plan.title || 'lesson-plan'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});