import { base44 } from '@/api/base44Client';

export async function createAssignmentNotification(assignment, teacher) {
  const students = await base44.entities.SchoolUser.filter({
    schoolId: assignment.schoolId,
    role: 'student',
    classId: assignment.classId,
    isArchived: false,
  });

  if (!students || students.length === 0) return;

  const targetUserIds = students.map(s => s.email);

  await base44.entities.Notification.create({
    schoolId: assignment.schoolId,
    schoolName: assignment.schoolName || '',
    type: 'assignment',
    title: `New Assignment: ${assignment.title}`,
    message: `${assignment.subjectName} — Due: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'TBD'}`,
    targetRole: 'student',
    targetClassIds: [assignment.classId],
    targetUserIds,
    relatedEntityId: assignment.id,
    relatedEntityType: 'Assignment',
    createdByUser: teacher?.email || '',
  });
}

export async function createQuizNotification(quiz, teacher) {
  const students = await base44.entities.SchoolUser.filter({
    schoolId: quiz.schoolId,
    role: 'student',
    classId: quiz.classId,
    isArchived: false,
  });

  if (!students || students.length === 0) return;

  const targetUserIds = students.map(s => s.email);

  await base44.entities.Notification.create({
    schoolId: quiz.schoolId,
    schoolName: quiz.schoolName || '',
    type: 'quiz',
    title: `New Quiz: ${quiz.title}`,
    message: `${quiz.subjectName} — ${quiz.durationMinutes} minutes`,
    targetRole: 'student',
    targetClassIds: [quiz.classId],
    targetUserIds,
    relatedEntityId: quiz.id,
    relatedEntityType: 'Quiz',
    createdByUser: teacher?.email || '',
  });
}

export async function createAnnouncementNotification(announcement, author) {
  const targetUserIds = [];

  if (announcement.targetRole === 'all') {
    const users = await base44.entities.SchoolUser.filter({
      schoolId: announcement.schoolId,
      isArchived: false,
    });
    targetUserIds.push(...(users || []).map(u => u.email));
  } else if (announcement.targetRole === 'parent') {
    const parents = await base44.entities.SchoolUser.filter({
      schoolId: announcement.schoolId,
      role: 'parent',
      isArchived: false,
    });
    targetUserIds.push(...(parents || []).map(u => u.email));
  } else if (announcement.targetRole === 'student') {
    if (announcement.targetClassIds?.length > 0) {
      const students = await base44.entities.SchoolUser.filter({
        schoolId: announcement.schoolId,
        role: 'student',
        isArchived: false,
      });
      targetUserIds.push(
        ...(students || [])
          .filter(s => announcement.targetClassIds.includes(s.classId))
          .map(s => s.email)
      );
    } else {
      const students = await base44.entities.SchoolUser.filter({
        schoolId: announcement.schoolId,
        role: 'student',
        isArchived: false,
      });
      targetUserIds.push(...(students || []).map(u => u.email));
    }
  }

  if (targetUserIds.length === 0) return;

  await base44.entities.Notification.create({
    schoolId: announcement.schoolId,
    schoolName: announcement.schoolName || '',
    type: 'announcement',
    title: announcement.title,
    message: announcement.message.substring(0, 100),
    targetRole: announcement.targetRole === 'all' ? 'student' : announcement.targetRole,
    targetClassIds: announcement.targetClassIds || [],
    targetUserIds,
    relatedEntityId: announcement.id,
    relatedEntityType: 'Announcement',
    createdByUser: author?.email || '',
  });
}

export async function createQuizResultNotification(submission, student) {
  const parentLinks = await base44.entities.SchoolUser.filter({
    schoolId: submission.schoolId,
    role: 'parent',
    linkedStudentIds: { $contains: student.id },
  });

  if (parentLinks && parentLinks.length > 0) {
    const targetUserIds = parentLinks.map(p => p.email);
    await base44.entities.Notification.create({
      schoolId: submission.schoolId,
      schoolName: '',
      type: 'quiz',
      title: `${student.fullName}'s Quiz Result`,
      message: `${submission.quizTitle} — Score: ${submission.score}/${submission.maxScore}`,
      targetRole: 'parent',
      targetUserIds,
      relatedEntityId: submission.id,
      relatedEntityType: 'QuizSubmission',
      createdByUser: 'system',
    });
  }
}