// Stream management utilities for SSS (Senior Secondary) classes

export const STREAM_OPTIONS = [
  { value: 'none', label: 'None (Mixed Class)', short: 'Mixed' },
  { value: 'science', label: 'Science', short: 'Science' },
  { value: 'arts', label: 'Arts & Humanities', short: 'Arts' },
  { value: 'commercial', label: 'Commercial', short: 'Commercial' },
];

export const SUBJECT_STREAM_OPTIONS = [
  { value: 'core', label: 'Core / General', short: 'Core' },
  { value: 'science', label: 'Science', short: 'Science' },
  { value: 'arts', label: 'Arts & Humanities', short: 'Arts' },
  { value: 'commercial', label: 'Commercial', short: 'Commercial' },
];

export const STREAM_LABELS = {
  none: 'Mixed',
  science: 'Science',
  arts: 'Arts & Humanities',
  commercial: 'Commercial',
  core: 'Core',
};

export const STREAM_COLORS = {
  none: 'bg-gray-100 text-gray-700',
  science: 'bg-blue-100 text-blue-700',
  arts: 'bg-purple-100 text-purple-700',
  commercial: 'bg-green-100 text-green-700',
  core: 'bg-amber-100 text-amber-700',
};

/**
 * Resolve the effective stream for a student.
 * If the class has a stream set (not "none"), use the class stream.
 * Otherwise use the student's individual stream.
 */
export function getStudentStream(student, classObj) {
  if (!student) return 'none';
  if (classObj?.classStream && classObj.classStream !== 'none') {
    return classObj.classStream;
  }
  return student.studentStream || 'none';
}

/**
 * Filter subjects based on a student's effective stream.
 * Returns: core subjects + stream-specific subjects (that are applicable to the class).
 * For JSS or unstreamed classes, returns all applicable subjects (unchanged behavior).
 */
export function getStudentSubjects(student, classObj, allSubjects) {
  if (!allSubjects || allSubjects.length === 0) return [];
  const classSubjects = allSubjects.filter(s =>
    (s.applicableClasses || []).includes(classObj?.id)
  );

  // Only apply stream filtering for senior classes
  if (!isStreamableClass(classObj)) return classSubjects;

  const stream = getStudentStream(student, classObj);

  // If no stream set, show only core subjects
  if (stream === 'none') {
    return classSubjects.filter(s => !s.streamType || s.streamType === 'core');
  }

  // Show core subjects + stream-specific subjects
  return classSubjects.filter(s =>
    !s.streamType || s.streamType === 'core' || s.streamType === stream
  );
}

/**
 * Check if a class supports streams (senior secondary only).
 */
export function isStreamableClass(classObj) {
  return classObj?.educationLevel === 'senior';
}

/**
 * Check if a class is a mixed class (senior with classStream === 'none').
 * Students in mixed classes can have individual streams.
 */
export function isMixedClass(classObj) {
  return isStreamableClass(classObj) && (!classObj?.classStream || classObj.classStream === 'none');
}