import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

export default function DigitalArtboard({ onSave, disabled = false, subject = 'general' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState('medium');
  const [background, setBackground] = useState(subject === 'math' ? 'grid' : 'white');
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [isPressure, setIsPressure] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const colors = ['#000000', '#0066FF', '#FF3333', '#00AA00', '#888888'];
  const sizes = { thin: 1.5, medium: 3, thick: 6 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = Math.max(400, window.innerHeight - 500);

    drawBackground();
    saveHistory();

    // Detect stylus/pressure support
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') {
        setIsPressure(e.pressure !== undefined && e.pressure > 0);
      }
    });

    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      saveHistory();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, []);

  const drawBackground = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (background === 'grid') {
      ctx.strokeStyle = '#E0E0E0';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let i = 0; i < canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    } else if (background === 'dotted') {
      ctx.fillStyle = '#E0E0E0';
      const dotSize = 1.5;
      const spacing = 15;
      for (let i = 0; i < canvas.width; i += spacing) {
        for (let j = 0; j < canvas.height; j += spacing) {
          ctx.beginPath();
          ctx.arc(i, j, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (background === 'lined') {
      ctx.strokeStyle = '#D0D0D0';
      ctx.lineWidth = 0.5;
      const lineSpacing = 25;
      for (let i = lineSpacing; i < canvas.height; i += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      ctx.strokeStyle = '#FF9999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 0);
      ctx.lineTo(50, canvas.height);
      ctx.stroke();
    }
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      redrawFromHistory(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      redrawFromHistory(historyStep + 1);
    }
  };

  const redrawFromHistory = (step) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[step];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    drawBackground();
    saveHistory();
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    startDrawing(x, y, e);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    draw(x, y, e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveHistory();
  };

  const startDrawing = (x, y, e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (x, y, e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pressure = e.pressure || 1;
    let sizeMultiplier = sizes[strokeSize];

    if (tool === 'pen') {
      if (isPressure && e.pointerType === 'pen') {
        ctx.lineWidth = sizeMultiplier * pressure;
      } else {
        ctx.lineWidth = sizeMultiplier;
      }
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1;
    } else if (tool === 'pencil') {
      ctx.lineWidth = sizeMultiplier * 0.7;
      ctx.strokeStyle = color;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = 0.8;
    } else if (tool === 'highlighter') {
      ctx.lineWidth = sizeMultiplier * 3;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.3;
    } else if (tool === 'eraser') {
      ctx.clearRect(x - sizeMultiplier, y - sizeMultiplier, sizeMultiplier * 2, sizeMultiplier * 2);
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        await onSave(blob);
        setIsSaving(false);
      }, 'image/png');
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border rounded-lg p-4 space-y-3 bg-secondary/30">
        {/* Tools */}
        <div className="flex flex-wrap gap-2">
          {['pen', 'pencil', 'highlighter', 'eraser'].map(t => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                tool === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background border border-input hover:bg-accent'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Colors and Sizes */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  color === c ? 'ring-2 ring-offset-1' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <select
            value={strokeSize}
            onChange={(e) => setStrokeSize(e.target.value)}
            className="px-2 py-1 text-xs border rounded bg-background"
          >
            <option value="thin">Thin</option>
            <option value="medium">Medium</option>
            <option value="thick">Thick</option>
          </select>

          <select
            value={background}
            onChange={(e) => {
              setBackground(e.target.value);
              setTimeout(() => drawBackground(), 0);
            }}
            className="px-2 py-1 text-xs border rounded bg-background"
          >
            <option value="white">White</option>
            <option value="grid">Grid (Math)</option>
            <option value="dotted">Dotted</option>
            <option value="lined">Lined</option>
          </select>
        </div>

        {/* History & Zoom */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={historyStep <= 0}
            className="gap-1"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className="gap-1"
          >
            <Redo2 className="w-4 h-4" /> Redo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
            className="gap-1"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(2, zoom + 0.2))}
            className="gap-1"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCanvas}
            className="gap-1 ml-auto"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className="w-full border rounded-lg bg-white cursor-crosshair shadow-sm"
        style={{ maxHeight: '600px' }}
      />

      {/* Submit Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving || disabled}
        className="w-full gap-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? 'Saving...' : 'Save & Submit Drawing'}
      </Button>
    </div>
  );
}