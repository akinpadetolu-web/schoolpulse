import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIME_SLOTS = [
  { start: '08:30', end: '09:15' },
  { start: '09:15', end: '10:00' },
  { start: '10:30', end: '11:15' },
  { start: '11:15', end: '12:00' },
  { start: '13:00', end: '13:45' },
  { start: '13:45', end: '14:30' },
  { start: '14:30', end: '15:15' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, targetClassIds, prompt } = await req.json();

    if (!schoolId || !targetClassIds || targetClassIds.length === 0) {
      return Response.json({ error: 'Missing required fields: schoolId, targetClassIds' }, { status: 400 });
    }

    console.log(`[generateTimetable] Fetching school data for ${schoolId}...`);

    const [allClasses, allSubjects, allTeachers, existingEntries] = await Promise.all([
      base44.asServiceRole.entities.SchoolClass.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.Subject.filter({ schoolId, isArchived: false }),
      base44.asServiceRole.entities.SchoolUser.filter({ schoolId, role: 'teacher', isArchived: false }),
      base44.asServiceRole.entities.TimetableEntry.filter({ schoolId }),
    ]);

    const targetClasses = (allClasses || []).filter(c => targetClassIds.includes(c.id));
    if (targetClasses.length === 0) {
      return Response.json({ error: 'No valid classes found for the given IDs' }, { status: 400 });
    }

    // Build context data for LLM
    const classesData = targetClasses.map(c => ({
      id: c.id,
      name: c.className,
      baseLevel: c.baseLevel,
      educationLevel: c.educationLevel,
    }));

    const subjectsData = (allSubjects || []).map(s => ({
      id: s.id,
      name: s.name,
      applicableClasses: s.applicableClasses || [],
    }));

    const teachersData = (allTeachers || []).map(t => ({
      id: t.id,
      name: t.fullName,
      teachingAssignments: t.teachingAssignments || [],
      assignedSubjects: t.assignedSubjects || [],
    }));

    const existingData = (existingEntries || []).map(e => ({
      classId: e.classId,
      className: e.className,
      day: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: e.subjectName,
      teacher: e.teacherName,
    }));

    const timeSlotsList = TIME_SLOTS.map(t => `${t.start}–${t.end}`).join(', ');

    const aiPrompt = `You are an expert school timetable scheduler. Generate a weekly timetable for a school.

CONSTRAINTS (MUST BE FOLLOWED):
- Days: Monday, Tuesday, Wednesday, Thursday, Friday
- Time slots: ${timeSlotsList}
- Friday has no 14:30–15:15 slot (ends at 14:30)
- No class can have two different subjects at the same time
- No teacher can teach two classes at the same time
- Spread subjects across different days when possible
- Priority subjects (Math, English, Science): 4–5 periods/week
- Other subjects: 2–3 periods/week

CLASSES TO SCHEDULE:
${JSON.stringify(classesData, null, 2)}

AVAILABLE SUBJECTS:
${JSON.stringify(subjectsData, null, 2)}

AVAILABLE TEACHERS:
${JSON.stringify(teachersData, null, 2)}

EXISTING TIMETABLE ENTRIES (DO NOT MODIFY):
${JSON.stringify(existingData, null, 2)}

USER PREFERENCES:
${prompt || 'None specified'}

OUTPUT FORMAT - Return ONLY a valid JSON object with this structure:
{
  "slots": [
    {
      "classId": "class_id",
      "className": "class_name",
      "subjectId": "subject_id",
      "subjectName": "subject_name",
      "teacherId": "teacher_id",
      "teacherName": "teacher_name",
      "dayOfWeek": "Monday|Tuesday|Wednesday|Thursday|Friday",
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ],
  "warnings": ["warning message 1", "warning message 2"]
}`;

    console.log('[generateTimetable] Calling Gemini Pro...');
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                classId: { type: 'string' },
                className: { type: 'string' },
                subjectId: { type: 'string' },
                subjectName: { type: 'string' },
                teacherId: { type: 'string' },
                teacherName: { type: 'string' },
                dayOfWeek: { type: 'string' },
                startTime: { type: 'string' },
                endTime: { type: 'string' },
              },
            },
          },
          warnings: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    });

    const slots = llmResponse.slots || [];
    const warnings = llmResponse.warnings || [];

    console.log(`[generateTimetable] LLM generated ${slots.length} slots`);

    // Validate and add schoolId to each slot
    const validSlots = slots.map(s => ({
      ...s,
      schoolId,
    }));

    if (validSlots.length > 0) {
      await base44.asServiceRole.entities.TimetableEntry.bulkCreate(validSlots);
      console.log(`[generateTimetable] Saved ${validSlots.length} entries`);
    }

    return Response.json({
      slots: validSlots,
      warnings,
      stats: {
        classes: targetClasses.length,
        subjects: subjectsData.length,
        teachers: teachersData.length,
        slots: validSlots.length,
      },
    });

  } catch (error) {
    console.error('[generateTimetable] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});