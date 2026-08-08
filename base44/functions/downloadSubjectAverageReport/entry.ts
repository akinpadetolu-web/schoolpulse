import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Convert a Uint8Array to a base64 string without blowing the call stack on large PDFs.
function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { studentId, callerId } = body || {};

    if (!studentId) {
      return Response.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Resolve the caller. SchoolPulse uses custom SchoolUser auth, so the in-app
    // caller passes their SchoolUser id (callerId). Fall back to a platform email
    // match for WhatsApp/Telegram / platform-authenticated contexts.
    let caller = null;
    if (callerId) {
      const r = await base44.asServiceRole.entities.SchoolUser.filter({ id: callerId });
      caller = (r || [])[0];
    }
    if (!caller) {
      try {
        const platformUser = await base44.auth.me();
        if (platformUser?.email) {
          const byEmail = await base44.asServiceRole.entities.SchoolUser.filter({ email: platformUser.email });
          caller = (byEmail || [])[0];
        }
      } catch {}
    }
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.isArchived) return Response.json({ error: 'Account is archived' }, { status: 403 });

    // Fetch the target student.
    const studs = await base44.asServiceRole.entities.SchoolUser.filter({ id: studentId });
    const student = (studs || [])[0];
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });
    if (student.schoolId !== caller.schoolId) {
      return Response.json({ error: 'Student does not belong to your school' }, { status: 403 });
    }

    // Access check — parent (linked), the student themselves, or a school admin.
    const role = caller.role || 'user';
    const isParent = role === 'parent' && (caller.linkedStudentIds || []).includes(studentId);
    const isSelf = role === 'student' && caller.id === studentId;
    const isAdmin = role === 'admin' || role === 'superAdmin';
    if (!isParent && !isSelf && !isAdmin) {
      return Response.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Compute per-subject averages from live grade records (instead of the legacy
    // stored `subjectAverages` field, which is rarely populated).
    const grades = await base44.asServiceRole.entities.Grade.filter({ schoolId: student.schoolId, studentId });
    const subjects = await base44.asServiceRole.entities.Subject.filter({ schoolId: student.schoolId });
    const subjectMap = {};
    (subjects || []).forEach((s) => { subjectMap[s.id] = s.name; });

    const bySubject = {};
    (grades || []).forEach((g) => {
      const key = g.subjectId || g.subjectName || 'Unknown';
      if (!bySubject[key]) bySubject[key] = { name: subjectMap[g.subjectId] || g.subjectName || 'Unknown', scores: [] };
      const max = g.maxScore || 100;
      bySubject[key].scores.push(max > 0 ? (g.score / max) * 100 : 0);
    });
    const rows = Object.values(bySubject).map((v) => ({
      subject: v.name,
      average: v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0,
    }));
    const overall = rows.length ? Math.round(rows.reduce((s, r) => s + r.average, 0) / rows.length) : 0;

    // Build the PDF.
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    doc.setFontSize(18);
    doc.setTextColor(51, 51, 51);
    doc.text('Subject Averages Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Student: ${student.fullName}`, 15, y); y += 6;
    doc.text(`Class: ${student.className || '—'}`, 15, y); y += 6;
    doc.text(`School: ${student.schoolName || '—'}`, 15, y); y += 6;
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, y); y += 12;

    // Table headers
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(70, 130, 180);
    const colWidth = (pageWidth - 30) / 2;
    doc.rect(15, y - 5, colWidth, 7, 'F');
    doc.rect(15 + colWidth, y - 5, colWidth, 7, 'F');
    doc.text('Subject', 17, y);
    doc.text('Average', 15 + colWidth + 2, y);
    y += 10;

    if (rows.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('No grade records found for this student yet.', 15, y);
      y += 8;
    } else {
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      let rowIndex = 0;
      rows.forEach((item) => {
        if (y > pageHeight - 25) { doc.addPage(); y = 15; }
        const bgColor = rowIndex % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(15, y - 5, colWidth, 7, 'F');
        doc.rect(15 + colWidth, y - 5, colWidth, 7, 'F');
        doc.setTextColor(51, 51, 51);
        doc.text(String(item.subject).slice(0, 40), 17, y);
        doc.text(`${item.average}%`, 15 + colWidth + 2, y);
        y += 7;
        rowIndex++;
      });

      // Overall row
      y += 4;
      doc.setFillColor(70, 130, 180);
      doc.rect(15, y - 5, colWidth, 7, 'F');
      doc.rect(15 + colWidth, y - 5, colWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text('Overall Average', 17, y);
      doc.text(`${overall}%`, 15 + colWidth + 2, y);
      y += 12;
    }

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('This report was automatically generated by the SchoolPulse system', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = toBase64(new Uint8Array(pdfBytes));
    const filename = `subject_averages_${(student.fullName || 'student').replace(/\s+/g, '_')}.pdf`;
    return Response.json({ pdf: pdfBase64, filename });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}