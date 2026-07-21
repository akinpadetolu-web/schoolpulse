import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { questions } = await req.json();
    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: 'Questions array required' }, { status: 400 });
    }

    // Validate and normalize questions
    const validated = questions.map((q, idx) => ({
      question: String(q.question || '').trim(),
      type: ['multiple_choice', 'true_false', 'short_answer'].includes(q.type) ? q.type : 'short_answer',
      correctAnswer: String(q.correctAnswer || '').trim(),
      options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()).filter(o => o) : [],
      points: Math.max(1, Number(q.points) || 1),
    })).filter(q => q.question);

    if (validated.length === 0) {
      return Response.json({ error: 'No valid questions found' }, { status: 400 });
    }

    // AI-based arrangement: group by type, then by difficulty (points)
    const grouped = {
      multiple_choice: [],
      true_false: [],
      short_answer: [],
    };

    validated.forEach(q => {
      grouped[q.type].push(q);
    });

    // Sort each group by points (easier first)
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.points - b.points);
    });

    // Arrange: true/false (warmup) → multiple choice (build) → short answer (challenge)
    const arranged = [
      ...grouped.true_false,
      ...grouped.multiple_choice,
      ...grouped.short_answer,
    ];

    return Response.json({
      arranged,
      stats: {
        total: arranged.length,
        byType: {
          multiple_choice: grouped.multiple_choice.length,
          true_false: grouped.true_false.length,
          short_answer: grouped.short_answer.length,
        },
      },
    });
  } catch (error) {
    console.error('Question arrangement error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});