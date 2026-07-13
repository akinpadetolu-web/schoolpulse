import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileUrl, fileType = 'text', topic = '', subjectName = '', questionCounts = {} } = body;

    if (!fileUrl) {
      return Response.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    // Default question distribution if not provided
    const counts = {
      multiple_choice: questionCounts.multiple_choice || 2,
      true_false: questionCounts.true_false || 1,
      short_answer: questionCounts.short_answer || 1,
      long_answer: questionCounts.long_answer || 1
    };

    // Fetch file content
    let fileContent = '';
    try {
      const fileRes = await fetch(fileUrl);
      if (!fileRes.ok) throw new Error('Failed to fetch file');

      if (fileType === 'pdf') {
        // For PDF, we'd need a PDF parser - using text extraction
        const buffer = await fileRes.arrayBuffer();
        fileContent = new TextDecoder().decode(buffer);
      } else if (fileType === 'docx') {
        // For DOCX, extract text (simplified - in production use proper library)
        const buffer = await fileRes.arrayBuffer();
        fileContent = new TextDecoder().decode(buffer);
      } else {
        fileContent = await fileRes.text();
      }
    } catch (err) {
      return Response.json({ error: 'Failed to read file: ' + err.message }, { status: 400 });
    }

    // Use Gemini Pro to intelligently generate questions
    const prompt = `You are an expert teacher and quiz creator. Analyze the following content and create a precise set of quiz questions.

Content/Topic: ${topic || 'General Knowledge'}
Subject: ${subjectName || 'General'}

Content to analyze (truncated to 2000 chars to minimize payload):
${fileContent.substring(0, 2000)}

Generate exactly:
- ${counts.multiple_choice} multiple choice questions (with 4 options each)
- ${counts.true_false} true/false questions
- ${counts.short_answer} short answer questions
- ${counts.long_answer} long essay questions

Return ONLY valid JSON array in this format (no markdown, no code blocks):
[
  {
    "question": "question text",
    "type": "multiple_choice|true_false|short_answer|long_answer",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option text or answer",
    "points": 1
  }
]

Rules:
- For multiple_choice: include exactly 4 options
- For true_false: options should be ["True", "False"]
- For short_answer: keep correctAnswer concise
- For long_answer: correctAnswer should be a rubric/key points
- All questions must be clear and well-formatted
- Points: 1 for multiple_choice/true_false, 2 for short_answer, 3-5 for long_answer
- Questions must align with the provided content
`;

    console.time('[smartQuizImport] AI_Generation');
    let response;
    try {
      response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_1_pro',
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  type: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: 'string' },
                  points: { type: 'number' }
                }
              }
            }
          }
        }
      });
    } catch (aiErr) {
      console.timeEnd('[smartQuizImport] AI_Generation');
      console.error('[smartQuizImport] AI call failed:', aiErr.message);
      return Response.json({ error: 'AI generation failed: ' + aiErr.message }, { status: 502 });
    }
    console.timeEnd('[smartQuizImport] AI_Generation');

    // Parse response
    let questions = [];
    if (response.questions && Array.isArray(response.questions)) {
      questions = response.questions.map(q => ({
        question: q.question || '',
        type: q.type || 'multiple_choice',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        points: q.points || 1
      }));
    }

    if (questions.length === 0) {
      return Response.json({ error: 'No questions generated. Try again with clearer content.' }, { status: 400 });
    }

    return Response.json({ 
      success: true,
      questions,
      message: `Generated ${questions.length} questions using Gemini Pro`
    });
  } catch (error) {
    console.error('Smart import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});