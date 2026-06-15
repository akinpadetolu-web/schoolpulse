import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileUrl, fileType = 'text', topic = '', subjectName = '' } = body;

    if (!fileUrl) {
      return Response.json({ error: 'fileUrl is required' }, { status: 400 });
    }

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
    const prompt = `You are an expert teacher and quiz creator. Analyze the following content and create a diverse set of quiz questions.

Content/Topic: ${topic || 'General Knowledge'}
Subject: ${subjectName || 'General'}

Content to analyze:
${fileContent.substring(0, 3000)}

Generate a well-balanced quiz with:
1. 2-3 multiple choice questions (with 4 options each)
2. 1-2 true/false questions
3. 1 short answer question
4. 1 passage-based reading question (if applicable)
5. 1 long essay question

Return ONLY valid JSON array in this format (no markdown, no code blocks):
[
  {
    "question": "question text",
    "type": "multiple_choice|true_false|short_answer|passage_based|long_answer",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option text or answer",
    "points": 1
  }
]

Rules:
- For multiple_choice: include exactly 4 options
- For true_false: options should be ["True", "False"]
- For short_answer: keep correctAnswer concise
- For passage_based: reference the provided content
- For long_answer: correctAnswer should be a rubric/key points
- All questions must be clear and well-formatted
- Points can be 1-5 based on difficulty
`;

    const response = await base44.integrations.Core.InvokeLLM({
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