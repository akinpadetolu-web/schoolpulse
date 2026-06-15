import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

const BLANK_QUESTION = { question: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: 1 };

export default function QuizQuestionEditor({ questions, onChange }) {
  function addQuestion() {
    onChange([...questions, { ...BLANK_QUESTION, options: ["", "", "", ""] }]);
  }

  function updateQuestion(idx, field, value) {
    const updated = questions.map((q, i) => i === idx ? { ...q, [field]: value } : q);
    onChange(updated);
  }

  function updateOption(qIdx, optIdx, value) {
    const updated = questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...(q.options || [])];
      opts[optIdx] = value;
      return { ...q, options: opts };
    });
    onChange(updated);
  }

  function removeQuestion(idx) {
    onChange(questions.filter((_, i) => i !== idx));
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="mb-3 text-sm">No questions yet.</p>
        <Button onClick={addQuestion}><Plus className="w-4 h-4 mr-2" />Add Question</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((q, idx) => (
        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-secondary/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Question {idx + 1}</span>
            <button onClick={() => removeQuestion(idx)} className="text-destructive hover:opacity-70">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Question Text</Label>
            <Input placeholder="Enter your question..." value={q.question} onChange={e => updateQuestion(idx, "question", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={q.type} onValueChange={v => updateQuestion(idx, "type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                  <SelectItem value="long_answer">Long Answer / Essay</SelectItem>
                  <SelectItem value="passage_based">Passage-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Points</Label>
              <Input type="number" min={1} value={q.points} onChange={e => updateQuestion(idx, "points", Number(e.target.value))} />
            </div>
          </div>

          {q.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label className="text-xs">Options (mark correct answer)</Label>
              {(q.options || ["", "", "", ""]).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuestion(idx, "correctAnswer", opt || String(oi))}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${q.correctAnswer === opt || q.correctAnswer === String(oi) ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'}`}
                  >
                    {(q.correctAnswer === opt || q.correctAnswer === String(oi)) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    onChange={e => {
                      if (q.correctAnswer === opt) updateQuestion(idx, "correctAnswer", e.target.value);
                      updateOption(idx, oi, e.target.value);
                    }}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Click the circle next to the correct answer.</p>
            </div>
          )}

          {q.type === "true_false" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Correct Answer</Label>
              <Select value={q.correctAnswer} onValueChange={v => updateQuestion(idx, "correctAnswer", v)}>
                <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {q.type === "short_answer" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Model Answer (for reference)</Label>
              <Input placeholder="Expected answer..." value={q.correctAnswer} onChange={e => updateQuestion(idx, "correctAnswer", e.target.value)} />
            </div>
          )}

          {q.type === "long_answer" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Marking Rubric / Key Points</Label>
              <Textarea placeholder="Outline key points students should cover..." value={q.correctAnswer} onChange={e => updateQuestion(idx, "correctAnswer", e.target.value)} rows={3} />
            </div>
          )}

          {q.type === "passage_based" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Expected Answer (for reference)</Label>
              <Textarea placeholder="Reference answer for grading..." value={q.correctAnswer} onChange={e => updateQuestion(idx, "correctAnswer", e.target.value)} rows={3} />
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion} className="w-full">
        <Plus className="w-4 h-4 mr-2" />Add Question
      </Button>
    </div>
  );
}