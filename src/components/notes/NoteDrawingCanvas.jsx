import React, { useRef, useState } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Pencil, Eraser, Trash2, Save, Undo, Redo } from 'lucide-react';

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#ffffff'];

export default function NoteDrawingCanvas({ onSave, onCancel, existingImageUrl }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const dataUrl = await canvasRef.current.exportImage('png');
    onSave(dataUrl);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
        <Button
          size="sm"
          variant={tool === 'pen' ? 'default' : 'outline'}
          onClick={() => setTool('pen')}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={tool === 'eraser' ? 'default' : 'outline'}
          onClick={() => setTool('eraser')}
        >
          <Eraser className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 ml-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setStrokeColor(c); setTool('pen'); }}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: strokeColor === c ? '#6366f1' : '#cbd5e1',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 ml-2 flex-1 min-w-[100px] max-w-[160px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Size</span>
          <Slider
            min={1} max={20} step={1}
            value={[strokeWidth]}
            onValueChange={([v]) => setStrokeWidth(v)}
            className="flex-1"
          />
        </div>

        <Button size="sm" variant="ghost" onClick={() => canvasRef.current?.undo()}>
          <Undo className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => canvasRef.current?.redo()}>
          <Redo className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => canvasRef.current?.clearCanvas()}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-white min-h-[300px]">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeColor={tool === 'eraser' ? '#ffffff' : strokeColor}
          strokeWidth={tool === 'eraser' ? strokeWidth * 3 : strokeWidth}
          eraserWidth={strokeWidth * 3}
          canvasColor="white"
          style={{ width: '100%', height: '100%', minHeight: '300px' }}
          withTimestamp={false}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving...' : 'Save Drawing'}
        </Button>
      </div>
    </div>
  );
}