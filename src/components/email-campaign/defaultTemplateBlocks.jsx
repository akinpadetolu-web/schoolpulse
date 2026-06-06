// Rich block definitions for all 10 default templates
// Every element is fully editable — no locks

export const DEFAULT_TEMPLATES_CONFIG = [
  {
    name: 'Welcome to New Term',
    category: 'welcome',
    description: 'Warm welcome for the start of a new academic term — deep blue & gold',
    gradient: 'from-blue-600 to-indigo-800',
    emoji: '🎒',
    blocks: [
      { id: 1, type: 'header', content: { text: 'Welcome to the New Term!', subtext: '{{school_name}} · Academic Year 2026', bgColor: '#1e3a8a', textColor: '#ffffff', subtextColor: '#bfdbfe', align: 'center', fontSize: 32, paddingV: 48 } },
      { id: 2, type: 'text', content: { text: '<p style="text-align:center;font-size:15px;color:#6b7280;margin:0">{{date}}</p>', bgColor: '#ffffff', textColor: '#6b7280', padding: 12 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '📅', title: 'Term Start Date', text: 'Monday, September 1', bgColor: '#eff6ff', textColor: '#1e40af' }, { icon: '📚', title: 'New Subjects', text: '12 subjects available', bgColor: '#f0fdf4', textColor: '#166534' }, { icon: '🎯', title: 'Term Goals', text: 'Excellence in all areas', bgColor: '#fefce8', textColor: '#854d0e' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>We are delighted to welcome you to the new academic term at <strong>{{school_name}}</strong>. We look forward to a productive, enriching, and exciting term ahead.</p><p>This term brings new opportunities for growth, learning, and achievement. Together, let us make it our best term yet!</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'table', content: { headers: ['Event', 'Date', 'Time'], rows: [['First Day of Classes','September 1, 2026','8:00 AM'],['Parent Orientation','September 3, 2026','10:00 AM'],['Mid-Term Break','October 14, 2026','All day']], headerBg: '#1e3a8a', headerText: '#ffffff', rowBg: '#ffffff', altRowBg: '#eff6ff', borderColor: '#bfdbfe' } },
      { id: 6, type: 'button', content: { text: 'View Full Term Calendar', url: '#', bgColor: '#1e3a8a', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 7, type: 'divider', content: { color: '#bfdbfe', thickness: 1, style: 'solid', marginH: 24 } },
      { id: 8, type: 'quote', content: { text: '"Education is the most powerful weapon you can use to change the world."', author: 'Nelson Mandela', bgColor: '#eff6ff', borderColor: '#1e3a8a', textColor: '#1e3a8a', fontSize: 15 } },
      { id: 9, type: 'footer', content: { text: '© {{school_name}} Administration', address: '123 School Street, City, State', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#1e3a8a', textColor: '#bfdbfe', align: 'center' } },
    ]
  },
  {
    name: 'Report Card Available',
    category: 'report_card',
    description: 'Notify parents that report cards are ready — purple & green',
    gradient: 'from-purple-600 to-violet-800',
    emoji: '🎓',
    blocks: [
      { id: 1, type: 'header', content: { text: '🎓 Report Card Available', subtext: 'Academic Performance Report — {{school_name}}', bgColor: '#6b21a8', textColor: '#ffffff', subtextColor: '#e9d5ff', align: 'center', fontSize: 28, paddingV: 44 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>We are pleased to inform you that the report card for <strong>{{student_name}}</strong> from <strong>{{class_name}}</strong> is now available for viewing in the parent portal.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '📊', title: 'View Grades', text: 'Log in to see full results', bgColor: '#faf5ff', textColor: '#7c3aed' }, { icon: '💬', title: 'Teacher Remarks', text: 'Read teacher comments', bgColor: '#f0fdf4', textColor: '#15803d' }, { icon: '📈', title: 'Progress Track', text: 'Compare with last term', bgColor: '#fff7ed', textColor: '#c2410c' }, { icon: '🏆', title: 'Achievements', text: 'See awards and honours', bgColor: '#fefce8', textColor: '#a16207' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'quote', content: { text: 'We are proud of {{student_name}}\'s hard work and dedication this term. Please log in to view the full report and teacher remarks.', bgColor: '#faf5ff', borderColor: '#7c3aed', textColor: '#6b21a8', fontSize: 14 } },
      { id: 5, type: 'button', content: { text: 'View Report Card Now', url: '#', bgColor: '#16a34a', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 6, type: 'text', content: { text: '<p style="font-size:13px;color:#6b7280;text-align:center">If you have any questions about the report card, please contact your child\'s class teacher or the school administration.</p>', bgColor: '#f9fafb', textColor: '#6b7280', padding: 16 } },
      { id: 7, type: 'footer', content: { text: '© {{school_name}}', address: 'Contact: admin@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f3f4f6', textColor: '#6b7280', align: 'center' } },
    ]
  },
  {
    name: 'School Fees Reminder',
    category: 'fee_reminder',
    description: 'Fee payment reminder — orange & red urgency styling',
    gradient: 'from-orange-500 to-red-600',
    emoji: '💳',
    blocks: [
      { id: 1, type: 'header', content: { text: '💳 Fee Payment Reminder', subtext: 'Action Required — Please read carefully', bgColor: '#ea580c', textColor: '#ffffff', subtextColor: '#fed7aa', align: 'center', fontSize: 28, paddingV: 40 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>This is a friendly reminder that school fees for <strong>{{student_name}}</strong> ({{class_name}}) are due. Please make your payment at the earliest convenience to avoid any disruption.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '💰', title: 'Amount Due', text: 'Contact accounts office', bgColor: '#fff7ed', textColor: '#c2410c' }, { icon: '📅', title: 'Due Date', text: 'Please pay promptly', bgColor: '#fef2f2', textColor: '#b91c1c' }, { icon: '✅', title: 'Payment Methods', text: 'Bank transfer, cash, card', bgColor: '#f0fdf4', textColor: '#15803d' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'text', content: { text: '<h3 style="color:#b91c1c">Payment Instructions:</h3><ol><li>Log in to the parent portal</li><li>Navigate to "Fees & Payments"</li><li>Select the outstanding fee</li><li>Choose your payment method</li><li>Keep the receipt for your records</li></ol>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'button', content: { text: 'Pay Fees Online Now', url: '#', bgColor: '#ea580c', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 6, type: 'quote', content: { text: 'For queries regarding fees, please contact our Accounts Office at accounts@school.edu or call during office hours.', bgColor: '#fff7ed', borderColor: '#ea580c', textColor: '#7c2d12', fontSize: 13 } },
      { id: 7, type: 'footer', content: { text: '© {{school_name}} Accounts Office', address: 'accounts@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f9fafb', textColor: '#6b7280', align: 'center' } },
    ]
  },
  {
    name: 'Exam Timetable Released',
    category: 'exam_timetable',
    description: 'Share the exam schedule — dark teal & mint green',
    gradient: 'from-teal-600 to-emerald-700',
    emoji: '📝',
    blocks: [
      { id: 1, type: 'header', content: { text: '📝 Exam Timetable', subtext: '{{class_name}} — {{school_name}}', bgColor: '#0f766e', textColor: '#ffffff', subtextColor: '#99f6e4', align: 'center', fontSize: 30, paddingV: 44 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>The examination timetable for <strong>{{class_name}}</strong> has been released. Please review the schedule carefully and prepare accordingly. Best of luck to all students!</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'table', content: { headers: ['Date', 'Subject', 'Time', 'Duration', 'Venue'], rows: [['Mon, Jun 10', 'Mathematics', '09:00 AM', '2 hours', 'Hall A'], ['Tue, Jun 11', 'English Language', '09:00 AM', '2 hours', 'Hall B'], ['Wed, Jun 12', 'Biology', '11:00 AM', '1.5 hours', 'Lab 1'], ['Thu, Jun 13', 'Chemistry', '09:00 AM', '1.5 hours', 'Lab 2'], ['Fri, Jun 14', 'Physics', '11:00 AM', '1.5 hours', 'Hall A']], headerBg: '#0f766e', headerText: '#ffffff', rowBg: '#ffffff', altRowBg: '#f0fdfa', borderColor: '#99f6e4' } },
      { id: 4, type: 'cards', content: { cards: [{ icon: '📖', title: 'Study Tips', text: 'Review past papers and notes', bgColor: '#f0fdfa', textColor: '#0f766e' }, { icon: '😴', title: 'Rest Well', text: 'Get 8 hours sleep each night', bgColor: '#fef9c3', textColor: '#a16207' }, { icon: '🍎', title: 'Eat Right', text: 'Healthy meals boost focus', bgColor: '#f0fdf4', textColor: '#15803d' }], bgColor: '#f8fafc' } },
      { id: 5, type: 'button', content: { text: 'Download Full Timetable PDF', url: '#', bgColor: '#0f766e', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 6, type: 'footer', content: { text: '© {{school_name}} Examinations Office', address: 'exams@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f0fdfa', textColor: '#0f766e', align: 'center' } },
    ]
  },
  {
    name: 'Event Invitation',
    category: 'event_invitation',
    description: 'Elegant event invitation — magenta & gold luxury style',
    gradient: 'from-pink-600 to-rose-700',
    emoji: '🎉',
    blocks: [
      { id: 1, type: 'header', content: { text: '🎉 You\'re Invited!', subtext: '{{school_name}} cordially invites you', bgColor: '#9d174d', textColor: '#ffffff', subtextColor: '#fbcfe8', align: 'center', fontSize: 32, paddingV: 48 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>We are delighted to invite you to attend our upcoming event. Please see the details below and RSVP at your earliest convenience.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '📅', title: 'Date', text: 'Saturday, June 20, 2026', bgColor: '#fdf2f8', textColor: '#9d174d' }, { icon: '⏰', title: 'Time', text: '10:00 AM – 3:00 PM', bgColor: '#fff7ed', textColor: '#c2410c' }, { icon: '📍', title: 'Venue', text: 'School Main Hall', bgColor: '#fefce8', textColor: '#a16207' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'text', content: { text: '<h3 style="color:#9d174d;text-align:center">Event Agenda</h3><ul style="list-style:none;padding:0"><li style="padding:8px 0;border-bottom:1px solid #fce7f3">🎤 10:00 AM — Opening Ceremony</li><li style="padding:8px 0;border-bottom:1px solid #fce7f3">🏆 11:00 AM — Awards Presentation</li><li style="padding:8px 0;border-bottom:1px solid #fce7f3">🍽 12:30 PM — Luncheon</li><li style="padding:8px 0">🎭 2:00 PM — Cultural Performances</li></ul>', bgColor: '#fdf2f8', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'two_col', content: { left: '<div style="text-align:center;padding:8px"><a href="#" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700">✓ RSVP Yes</a></div>', right: '<div style="text-align:center;padding:8px"><a href="#" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700">✗ Cannot Attend</a></div>', bgColor: '#ffffff', leftBg: '#ffffff', rightBg: '#ffffff' } },
      { id: 6, type: 'footer', content: { text: '© {{school_name}} Events Office', address: 'events@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#fdf2f8', textColor: '#9d174d', align: 'center' } },
    ]
  },
  {
    name: 'Emergency Notice',
    category: 'emergency',
    description: 'Urgent emergency communication — red & white',
    gradient: 'from-red-600 to-red-800',
    emoji: '🚨',
    blocks: [
      { id: 1, type: 'header', content: { text: '🚨 IMPORTANT NOTICE', subtext: 'Please read this message immediately', bgColor: '#b91c1c', textColor: '#ffffff', subtextColor: '#fecaca', align: 'center', fontSize: 30, paddingV: 40 } },
      { id: 2, type: 'text', content: { text: '<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:4px"><strong style="color:#b91c1c">⚠ Action Required</strong><p style="color:#7f1d1d;margin:8px 0 0">Dear {{first_name}}, this is an urgent message from {{school_name}} requiring your immediate attention.</p></div>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'text', content: { text: '<h3 style="color:#b91c1c">Notice Details</h3><p>Please insert the full notice details here. Be clear and concise about what action parents/students need to take.</p><p><strong>What happened:</strong> [Describe the situation]</p><p><strong>What you need to do:</strong> [List required actions]</p><p><strong>Deadline:</strong> [If applicable]</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 4, type: 'cards', content: { cards: [{ icon: '📞', title: 'Call Us', text: '+1 (555) 000-0000', bgColor: '#fef2f2', textColor: '#b91c1c' }, { icon: '📧', title: 'Email Us', text: 'admin@school.edu', bgColor: '#fef2f2', textColor: '#b91c1c' }, { icon: '🌐', title: 'Check Portal', text: 'school.edu/portal', bgColor: '#fef2f2', textColor: '#b91c1c' }], bgColor: '#f8fafc' } },
      { id: 5, type: 'button', content: { text: 'Acknowledge This Notice', url: '#', bgColor: '#b91c1c', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 6, type: 'footer', content: { text: '© {{school_name}} Management', address: 'admin@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#fef2f2', textColor: '#b91c1c', align: 'center' } },
    ]
  },
  {
    name: 'General Newsletter',
    category: 'newsletter',
    description: 'Monthly school newsletter — navy & bright cyan',
    gradient: 'from-slate-700 to-blue-800',
    emoji: '📰',
    blocks: [
      { id: 1, type: 'header', content: { text: '📰 {{school_name}} Newsletter', subtext: 'Keeping you connected to our school community', bgColor: '#1e293b', textColor: '#ffffff', subtextColor: '#7dd3fc', align: 'center', fontSize: 28, paddingV: 44 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>Welcome to our latest school newsletter! Here are the highlights from this period at <strong>{{school_name}}</strong>.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '📚', title: 'Academic News', text: 'Latest updates from classrooms', bgColor: '#eff6ff', textColor: '#1e40af' }, { icon: '🏅', title: 'Achievements', text: 'Student accomplishments', bgColor: '#f0fdf4', textColor: '#15803d' }, { icon: '📅', title: 'Upcoming Events', text: 'Don\'t miss these dates', bgColor: '#fef9c3', textColor: '#a16207' }], bgColor: '#f1f5f9' } },
      { id: 4, type: 'text', content: { text: '<h3 style="color:#1e293b;border-bottom:2px solid #7dd3fc;padding-bottom:8px">📌 Featured Story</h3><p>Replace this text with your featured story. Include compelling details about what\'s happening at your school this month.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'text', content: { text: '<h3 style="color:#1e293b;border-bottom:2px solid #7dd3fc;padding-bottom:8px">🏆 Student Spotlight</h3><p>Celebrate outstanding student achievements here. Mention names, grades, and what they accomplished.</p>', bgColor: '#f8fafc', textColor: '#1f2937', padding: 24 } },
      { id: 6, type: 'table', content: { headers: ['Event', 'Date', 'Who'], rows: [['Sports Day', 'June 20, 2026', 'All Students'], ['Parent Meeting', 'June 25, 2026', 'All Parents'], ['End of Term', 'July 4, 2026', 'All']], headerBg: '#1e293b', headerText: '#7dd3fc', rowBg: '#ffffff', altRowBg: '#f1f5f9', borderColor: '#e2e8f0' } },
      { id: 7, type: 'button', content: { text: 'Read Full Newsletter Online', url: '#', bgColor: '#1e293b', textColor: '#7dd3fc', align: 'center', borderRadius: 6, fontSize: 14, paddingH: 28, paddingV: 12 } },
      { id: 8, type: 'footer', content: { text: '© {{school_name}} Communications', address: 'newsletter@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#1e293b', textColor: '#7dd3fc', align: 'center' } },
    ]
  },
  {
    name: 'Parent-Teacher Meeting',
    category: 'parent_teacher_meeting',
    description: 'P-T meeting invitation — forest green & cream',
    gradient: 'from-green-700 to-emerald-800',
    emoji: '🤝',
    blocks: [
      { id: 1, type: 'header', content: { text: '🤝 Parent-Teacher Meeting', subtext: '{{school_name}} — Academic Progress Discussion', bgColor: '#15803d', textColor: '#ffffff', subtextColor: '#bbf7d0', align: 'center', fontSize: 28, paddingV: 44 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>We would like to invite you to attend the upcoming Parent-Teacher Meeting at <strong>{{school_name}}</strong> to discuss <strong>{{student_name}}\'s</strong> academic progress, strengths, and areas for improvement.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '📅', title: 'Date', text: 'Friday, June 20, 2026', bgColor: '#f0fdf4', textColor: '#15803d' }, { icon: '⏰', title: 'Time', text: 'Your appointment time', bgColor: '#fefce8', textColor: '#a16207' }, { icon: '📍', title: 'Location', text: 'School Conference Room', bgColor: '#eff6ff', textColor: '#1d4ed8' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'text', content: { text: '<h3 style="color:#15803d">Meeting Agenda:</h3><ul><li>Review of {{student_name}}\'s academic performance</li><li>Discussion of strengths and areas for growth</li><li>Teacher feedback and observations</li><li>Setting goals for the remainder of the term</li><li>Q&A — Your questions and concerns</li></ul>', bgColor: '#f0fdf4', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'text', content: { text: '<h3 style="color:#15803d">Please Bring:</h3><ul><li>Any questions you have about {{student_name}}\'s education</li><li>Previous report cards (if available)</li><li>Notes about challenges your child faces at home</li></ul>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 6, type: 'two_col', content: { left: '<div style="text-align:center;padding:8px"><a href="#" style="background:#15803d;color:#fff;padding:12px 24px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700">✓ Confirm Attendance</a></div>', right: '<div style="text-align:center;padding:8px"><a href="#" style="background:#6b7280;color:#fff;padding:12px 24px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700">📞 Request Different Time</a></div>', bgColor: '#ffffff', leftBg: '#ffffff', rightBg: '#ffffff' } },
      { id: 7, type: 'footer', content: { text: '© {{school_name}} Academic Office', address: 'academic@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#f0fdf4', textColor: '#15803d', align: 'center' } },
    ]
  },
  {
    name: 'New Student Welcome',
    category: 'new_student',
    description: 'Cheerful welcome for new students — sky blue & sunshine yellow',
    gradient: 'from-sky-500 to-yellow-400',
    emoji: '⭐',
    blocks: [
      { id: 1, type: 'header', content: { text: '⭐ Welcome to {{school_name}}!', subtext: 'We\'re so excited to have you join our family', bgColor: '#0ea5e9', textColor: '#ffffff', subtextColor: '#fef08a', align: 'center', fontSize: 30, paddingV: 48 } },
      { id: 2, type: 'text', content: { text: '<p>Dear {{first_name}},</p><p>A very warm welcome to <strong>{{school_name}}</strong>! We are thrilled to have you join our school family. We hope your time here will be full of learning, growth, friendship, and unforgettable memories.</p>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '🏫', title: 'Your Class', text: '{{class_name}}', bgColor: '#e0f2fe', textColor: '#0369a1' }, { icon: '📚', title: 'Subjects', text: 'Check your timetable', bgColor: '#fef9c3', textColor: '#a16207' }, { icon: '👥', title: 'Student Community', text: 'Make new friends!', bgColor: '#fdf4ff', textColor: '#7e22ce' }, { icon: '📞', title: 'Need Help?', text: 'Visit the admin office', bgColor: '#f0fdf4', textColor: '#15803d' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'text', content: { text: '<h3 style="color:#0369a1">Your First Day Checklist:</h3><ul><li>✅ Arrive by 7:45 AM</li><li>✅ Report to the Admin Office</li><li>✅ Collect your timetable and student ID</li><li>✅ Meet your class teacher in {{class_name}}</li><li>✅ Bring all required school supplies</li></ul>', bgColor: '#e0f2fe', textColor: '#1f2937', padding: 24 } },
      { id: 5, type: 'two_col', content: { left: '<div style="text-align:center;padding:8px"><a href="#" style="background:#0369a1;color:#fff;padding:12px 20px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700;font-size:13px">📥 Download Student Handbook</a></div>', right: '<div style="text-align:center;padding:8px"><a href="#" style="background:#d97706;color:#fff;padding:12px 20px;border-radius:8px;display:inline-block;text-decoration:none;font-weight:700;font-size:13px">🗓 View School Calendar</a></div>', bgColor: '#ffffff', leftBg: '#ffffff', rightBg: '#ffffff' } },
      { id: 6, type: 'footer', content: { text: '© {{school_name}} Student Affairs', address: 'welcome@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#e0f2fe', textColor: '#0369a1', align: 'center' } },
    ]
  },
  {
    name: 'Achievement & Awards',
    category: 'achievement',
    description: 'Celebrate student achievements — deep gold & royal blue',
    gradient: 'from-yellow-500 to-amber-600',
    emoji: '🏆',
    blocks: [
      { id: 1, type: 'header', content: { text: '🏆 Achievement Recognition', subtext: '{{school_name}} — Certificate of Excellence', bgColor: '#b45309', textColor: '#ffffff', subtextColor: '#fde68a', align: 'center', fontSize: 30, paddingV: 48 } },
      { id: 2, type: 'text', content: { text: '<div style="border:3px solid #d97706;border-radius:12px;padding:24px;text-align:center;background:#fffbeb"><p style="font-size:18px;color:#92400e;font-weight:700">🎖 This is to certify that</p><p style="font-size:24px;color:#b45309;font-weight:900">{{student_name}}</p><p style="color:#92400e">of <strong>{{class_name}}</strong> at <strong>{{school_name}}</strong><br/>has demonstrated outstanding excellence</p></div>', bgColor: '#ffffff', textColor: '#1f2937', padding: 24 } },
      { id: 3, type: 'cards', content: { cards: [{ icon: '⭐', title: 'Achievement', text: 'Outstanding Performance', bgColor: '#fffbeb', textColor: '#b45309' }, { icon: '📊', title: 'Category', text: 'Academic Excellence', bgColor: '#eff6ff', textColor: '#1d4ed8' }, { icon: '🗓', title: 'Date Awarded', text: '{{date}}', bgColor: '#f0fdf4', textColor: '#15803d' }], bgColor: '#f8fafc' } },
      { id: 4, type: 'quote', content: { text: '"Congratulations on this outstanding achievement. Your hard work, dedication, and commitment to excellence truly sets an example for all."', author: '{{school_name}} Principal', bgColor: '#fffbeb', borderColor: '#d97706', textColor: '#92400e', fontSize: 14 } },
      { id: 5, type: 'button', content: { text: '🎉 View Full Achievement Record', url: '#', bgColor: '#b45309', textColor: '#ffffff', align: 'center', borderRadius: 8, fontSize: 15, paddingH: 32, paddingV: 14 } },
      { id: 6, type: 'divider', content: { color: '#fde68a', thickness: 2, style: 'solid', marginH: 24 } },
      { id: 7, type: 'footer', content: { text: '© {{school_name}} Academic Office', address: 'awards@school.edu', unsubText: 'Unsubscribe', unsubUrl: '#', bgColor: '#fffbeb', textColor: '#b45309', align: 'center' } },
    ]
  },
];

export const CATEGORY_LABELS_ALL = {
  welcome: 'Welcome', report_card: 'Report Card', fee_reminder: 'Fee Reminder',
  exam_timetable: 'Exam Timetable', event_invitation: 'Event', emergency: 'Emergency',
  newsletter: 'Newsletter', parent_teacher_meeting: 'Parent-Teacher',
  new_student: 'New Student', achievement: 'Achievement', custom: 'Custom',
};