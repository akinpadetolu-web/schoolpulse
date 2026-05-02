import React from 'react';
import { Badge } from '@/components/ui/badge';

function getLetterColor(letter) {
  if (!letter) return '#6b7280';
  const l = letter.toUpperCase();
  if (l.startsWith('A')) return '#16a34a';
  if (l.startsWith('B')) return '#2563eb';
  if (l.startsWith('C')) return '#d97706';
  if (l.startsWith('D')) return '#ea580c';
  return '#dc2626';
}

export default function ReportCardViewer({ reportCard, template }) {
  if (!reportCard) return null;

  const primaryColor = template?.schoolBranding?.primaryColor || '#1e3a5f';
  const secondaryColor = template?.schoolBranding?.secondaryColor || '#f0f4ff';
  const gradeScale = template?.gradeScale || 'both';

  const showGrade = (avg, letter) => {
    if (gradeScale === 'percentage') return `${avg}%`;
    if (gradeScale === 'letter') return letter || '-';
    return `${avg}% (${letter || '-'})`;
  };

  return (
    <div className="bg-white font-inter text-gray-800 max-w-3xl mx-auto shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">
      {/* Header */}
      <div style={{ backgroundColor: primaryColor }} className="text-white px-8 py-6">
        <div className="flex items-center gap-4">
          {template?.schoolLogo && (
            <img src={template.schoolLogo} alt="School Logo" className="w-16 h-16 object-contain rounded-full bg-white p-1" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{reportCard.schoolName}</h1>
            <p className="text-sm opacity-80">Academic Report Card</p>
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div style={{ backgroundColor: secondaryColor }} className="px-8 py-4 border-b">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium uppercase text-xs">Student</p>
            <p className="font-semibold">{reportCard.studentName}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium uppercase text-xs">Class</p>
            <p className="font-semibold">{reportCard.className}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium uppercase text-xs">Position</p>
            <p className="font-semibold">{reportCard.classPosition ? `#${reportCard.classPosition}` : '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium uppercase text-xs">Period</p>
            <p className="font-semibold">{reportCard.period}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium uppercase text-xs">Date</p>
            <p className="font-semibold">{reportCard.generatedDate || '-'}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Overall Performance */}
        <div className="flex items-center gap-6 p-4 rounded-xl border" style={{ borderColor: primaryColor + '33', backgroundColor: primaryColor + '08' }}>
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: primaryColor }}>{reportCard.overallAverage ?? '-'}%</p>
            <p className="text-xs text-gray-500 mt-1">Overall Average</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ color: getLetterColor(reportCard.overallLetterGrade) }}>
              {reportCard.overallLetterGrade || '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Letter Grade</p>
          </div>
          {template?.includePromotionRecommendation && reportCard.promotionRecommendation && (
            <div className="ml-auto">
              <Badge className={
                reportCard.promotionRecommendation === 'promote' ? 'bg-green-100 text-green-700' :
                reportCard.promotionRecommendation === 'repeat' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }>
                {reportCard.promotionRecommendation === 'promote' ? '✓ Promoted' :
                 reportCard.promotionRecommendation === 'repeat' ? '✗ Repeat Year' : '⚠ Under Review'}
              </Badge>
            </div>
          )}
        </div>

        {/* Subject Grades */}
        {template?.includeSubjectAverages !== false && reportCard.subjectGrades?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Subject Performance</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: primaryColor }} className="text-white">
                  <th className="text-left px-4 py-2 rounded-tl-lg">Subject</th>
                  <th className="text-center px-4 py-2">Grade</th>
                  <th className="text-center px-4 py-2 rounded-tr-lg">Remark</th>
                </tr>
              </thead>
              <tbody>
                {reportCard.subjectGrades.map((sg, i) => (
                  <React.Fragment key={sg.subjectId || i}>
                    <tr className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2 font-medium">{sg.subjectName}</td>
                      <td className="px-4 py-2 text-center font-semibold" style={{ color: getLetterColor(sg.letterGrade) }}>
                        {showGrade(sg.weightedAverage, sg.letterGrade)}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500">
                        {sg.weightedAverage >= 80 ? 'Excellent' :
                         sg.weightedAverage >= 65 ? 'Good' :
                         sg.weightedAverage >= 50 ? 'Average' : 'Needs Improvement'}
                      </td>
                    </tr>
                    {template?.includeCategoryBreakdown && sg.categoryBreakdown?.length > 0 && (
                      <tr className="bg-blue-50">
                        <td colSpan={3} className="px-6 py-2">
                          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                            {sg.categoryBreakdown.map((cb, j) => (
                              <span key={j} className="bg-white border rounded px-2 py-1">
                                {cb.categoryName}: <strong>{cb.average?.toFixed(1)}%</strong> ({cb.weight}% weight)
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Row */}
        {(template?.includeAttendance || template?.includeAssignmentRate || template?.includeLessonProgress) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {template?.includeAttendance && (
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{reportCard.attendanceRate ?? '-'}%</p>
                <p className="text-xs text-gray-500 mt-1">Attendance Rate</p>
              </div>
            )}
            {template?.includeAssignmentRate && (
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{reportCard.assignmentSubmissionRate ?? '-'}%</p>
                <p className="text-xs text-gray-500 mt-1">Assignment Submission Rate</p>
              </div>
            )}
            {template?.includeLessonProgress && (
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{reportCard.lessonCount ?? '-'}</p>
                <p className="text-xs text-gray-500 mt-1">Lessons Attended</p>
              </div>
            )}
          </div>
        )}

        {/* Lesson Progress Summary */}
        {template?.includeLessonProgress && reportCard.lessonProgressSummary && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Lesson Progress</h3>
            <p className="text-sm text-gray-700">{reportCard.lessonProgressSummary}</p>
          </div>
        )}

        {/* Behavior */}
        {template?.includeBehavior && reportCard.behaviorSummary && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Behavior Summary</h3>
            <p className="text-sm text-gray-700">{reportCard.behaviorSummary}</p>
          </div>
        )}

        {/* Teacher Comment */}
        {template?.includeComments && reportCard.teacherComment && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Teacher's Comment</h3>
            <p className="text-sm text-gray-700 italic">"{reportCard.teacherComment}"</p>
          </div>
        )}

        {/* Principal Comment */}
        {template?.includePrincipalComment && reportCard.principalComment && (
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Principal's Comment</h3>
            <p className="text-sm text-gray-700 italic">"{reportCard.principalComment}"</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          {template?.footerText || `${reportCard.schoolName} — Confidential Academic Record`}
        </div>
      </div>
    </div>
  );
}