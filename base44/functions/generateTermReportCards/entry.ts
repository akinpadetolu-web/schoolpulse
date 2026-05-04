import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { schoolId, term } = await req.json();

    if (!schoolId || !term) {
      return Response.json({ error: 'Missing schoolId or term' }, { status: 400 });
    }

    // Get all students in the school
    const students = await base44.asServiceRole.entities.SchoolUser.filter({
      schoolId,
      role: 'student',
      isArchived: false
    });

    // Get grading system for letter grade mapping
    const gradingSystems = await base44.asServiceRole.entities.GradingSystem.filter({ schoolId });
    const gradingSystem = gradingSystems?.[0];

    const gradeScale = gradingSystem?.grades || [];

    // Helper function to get letter grade
    const getLetterGrade = (score) => {
      const grade = gradeScale.find(g => score >= g.minScore && score <= g.maxScore);
      return grade?.letter || 'F';
    };

    // Helper function to get label
    const getLabel = (score) => {
      const grade = gradeScale.find(g => score >= g.minScore && score <= g.maxScore);
      return grade?.label || 'Incomplete';
    };

    // Get all subjects for the school
    const subjects = await base44.asServiceRole.entities.Subject.filter({ schoolId });

    // Generate report cards
    const reportCardsToCreate = [];
    let successCount = 0;

    for (const student of students) {
      if (!student.termSubjectGrades || student.termSubjectGrades.length === 0) {
        continue; // Skip students with no grades
      }

      // Filter grades for this term
      const termGrades = student.termSubjectGrades.filter(tg => tg.term === term);

      if (termGrades.length === 0) {
        continue; // No grades for this term
      }

      // Build subject breakdown
      const subjectGrades = termGrades.map(tg => {
        const subject = subjects.find(s => s.id === tg.subjectId);
        const weightedAverage = tg.weightedAverage || 0;
        return {
          subjectId: tg.subjectId,
          subjectName: subject?.name || 'Unknown Subject',
          weightedAverage,
          letterGrade: getLetterGrade(weightedAverage),
          label: getLabel(weightedAverage)
        };
      });

      // Calculate overall average using subject weights if configured
      let overallAverage;
      if (gradingSystem?.subjectWeights && gradingSystem.subjectWeights.length > 0) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        subjectGrades.forEach(sg => {
          const subjectWeight = gradingSystem.subjectWeights.find(sw => sw.subjectId === sg.subjectId);
          if (subjectWeight) {
            weightedSum += sg.weightedAverage * (subjectWeight.weight / 100);
            totalWeight += subjectWeight.weight / 100;
          }
        });
        
        overallAverage = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      } else {
        // Default: equal weight for all subjects
        overallAverage = Math.round(
          subjectGrades.reduce((sum, sg) => sum + sg.weightedAverage, 0) / subjectGrades.length
        );
      }

      // Create report card
      const reportCard = {
        schoolId,
        schoolName: student.schoolName,
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        classId: student.classId,
        className: student.className,
        period: term,
        generatedDate: new Date().toISOString().split('T')[0],
        subjectGrades,
        overallAverage,
        overallLetterGrade: getLetterGrade(overallAverage),
        status: 'generated'
      };

      reportCardsToCreate.push(reportCard);
    }

    // Check for existing report cards and update/create as needed
    if (reportCardsToCreate.length > 0) {
      for (const rc of reportCardsToCreate) {
        const existingCards = await base44.asServiceRole.entities.ReportCard.filter({
          schoolId,
          studentId: rc.studentId,
          period: term
        });

        if (existingCards.length > 0) {
          // Update existing
          await base44.asServiceRole.entities.ReportCard.update(existingCards[0].id, rc);
        } else {
          // Create new
          await base44.asServiceRole.entities.ReportCard.create(rc);
        }
        successCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Report cards generated for ${successCount} students in term ${term}`,
      count: successCount
    });
  } catch (error) {
    console.error('Report card generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});