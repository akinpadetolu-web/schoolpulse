import { jsPDF } from 'npm:jspdf@4.0.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reportCardId } = body;

    if (!reportCardId) {
      return Response.json({ error: 'Report card ID required' }, { status: 400 });
    }

    // Fetch the report card
    const reportCard = await base44.asServiceRole.entities.ReportCard.filter({
      id: reportCardId,
      schoolId: user.data?.schoolId
    });

    if (!reportCard || reportCard.length === 0) {
      return Response.json({ error: 'Report card not found' }, { status: 404 });
    }

    const card = reportCard[0];

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Report Card', 20, y);
    y += 15;

    // School and student info
    doc.setFontSize(11);
    doc.text(`School: ${card.schoolName}`, 20, y);
    y += 7;
    doc.text(`Student: ${card.studentName}`, 20, y);
    y += 7;
    doc.text(`Class: ${card.className}`, 20, y);
    y += 7;
    doc.text(`Period: ${card.period}`, 20, y);
    y += 7;
    doc.text(`Generated: ${new Date(card.generatedDate).toLocaleDateString()}`, 20, y);
    y += 15;

    // Overall Summary
    doc.setFontSize(12);
    doc.text('Overall Performance', 20, y);
    y += 8;
    doc.setFontSize(10);
    if (card.overallAverage !== undefined) {
      doc.text(`Overall Average: ${Math.round(card.overallAverage)}%`, 20, y);
      y += 6;
    }
    if (card.overallLetterGrade) {
      doc.text(`Overall Grade: ${card.overallLetterGrade}`, 20, y);
      y += 6;
    }
    if (card.attendanceRate !== undefined) {
      doc.text(`Attendance: ${Math.round(card.attendanceRate)}%`, 20, y);
      y += 6;
    }
    y += 5;

    // Subject Grades Table
    if (card.subjectGrades && card.subjectGrades.length > 0) {
      doc.setFontSize(12);
      doc.text('Subject Grades', 20, y);
      y += 8;

      // Table headers
      doc.setFontSize(9);
      const colX = [20, 80, 130, 170];
      doc.text('Subject', colX[0], y);
      doc.text('Average', colX[1], y);
      doc.text('Grade', colX[2], y);
      doc.text('Status', colX[3], y);
      y += 6;

      // Table rows
      doc.setDrawColor(200);
      doc.line(20, y - 1, 200, y - 1);
      y += 2;

      card.subjectGrades.forEach(sg => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        doc.text(sg.subjectName, colX[0], y);
        doc.text(`${Math.round(sg.weightedAverage)}%`, colX[1], y);
        doc.text(sg.letterGrade || '—', colX[2], y);
        const status = sg.letterGrade && ['A', 'B', 'C'].some(g => sg.letterGrade.startsWith(g)) ? 'Pass' : 'Fail';
        doc.text(status, colX[3], y);
        y += 6;
      });
      y += 5;
    }

    // Teacher Comment
    if (card.teacherComment) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text('Teacher Comment', 20, y);
      y += 6;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(card.teacherComment, 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 5;
    }

    // Principal Comment
    if (card.principalComment) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.text('Principal Comment', 20, y);
      y += 6;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(card.principalComment, 170);
      doc.text(lines, 20, y);
    }

    // Generate PDF and return
    const pdfBytes = doc.output('arraybuffer');
    const filename = `${card.studentName}-${card.period.replace(/\s+/g, '-')}-ReportCard.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Report card download error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});