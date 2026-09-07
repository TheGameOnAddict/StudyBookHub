import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DrawingPoint, DrawingStroke, DrawingTool } from '../../types';
import { getPageDrawings, savePageDrawings } from '../../services/db';

interface DrawingCanvasProps {
  bookId: string;
  pageNumber: number;
  width: number;
  height: number;
  activeTool: DrawingTool;
  activeColor: string;
  strokeWidth: number;
  isDrawingActive: boolean;
  onStrokeAdded?: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  bookId,
  pageNumber,
  width,
  height,
  activeTool,
  activeColor,
  strokeWidth,
  isDrawingActive,
  onStrokeAdded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const isDrawing = useRef(false);
  const currentPoints = useRef<DrawingPoint[]>([]);

  // Load existing drawings for this page from IndexedDB
  useEffect(() => {
    let isMounted = true;
    getPageDrawings(bookId, pageNumber).then((savedStrokes) => {
      if (isMounted) {
        setStrokes(savedStrokes || []);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [bookId, pageNumber]);

  // Redraw canvas whenever strokes or dimensions change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.clearRect(0, 0, width, height);

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();

      if (stroke.isHighlighter) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * (width / 800) * 2.5; // Highlighter is wider
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * (width / 800);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      // Convert normalized points [0..1] to current canvas pixels
      const p0 = stroke.points[0];
      ctx.moveTo(p0.x * width, p0.y * height);

      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i];
        // Quadratic bezier smoothing for natural handwritten ink
        if (i < stroke.points.length - 1) {
          const next = stroke.points[i + 1];
          const midX = ((p1.x + next.x) / 2) * width;
          const midY = ((p1.y + next.y) / 2) * height;
          ctx.quadraticCurveTo(p1.x * width, p1.y * height, midX, midY);
        } else {
          ctx.lineTo(p1.x * width, p1.y * height);
        }
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, width, height]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Save strokes to IndexedDB whenever strokes change
  const saveStrokesToDb = useCallback(
    async (updatedStrokes: DrawingStroke[]) => {
      try {
        await savePageDrawings(bookId, pageNumber, updatedStrokes);
        onStrokeAdded?.();
      } catch (err) {
        console.error('Failed to save drawing strokes:', err);
      }
    },
    [bookId, pageNumber, onStrokeAdded]
  );

  // Pointer event handlers (works for Mouse, Touch, and Stylus/Apple Pencil)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to track outside bounds
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    currentPoints.current = [{ x, y, pressure }];

    if (activeTool === 'eraser') {
      // Erase any stroke that is touched
      eraseStrokeAtPoint(x, y);
    }
  };

  const eraseStrokeAtPoint = (x: number, y: number) => {
    const eraseThreshold = 0.035; // Normalized hit box
    const remaining = strokes.filter((stroke) => {
      const hit = stroke.points.some((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) < eraseThreshold;
      });
      return !hit;
    });

    if (remaining.length !== strokes.length) {
      setUndoStack((prev) => [...prev, strokes]);
      setStrokes(remaining);
      saveStrokesToDb(remaining);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingActive || !isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (activeTool === 'eraser') {
      eraseStrokeAtPoint(x, y);
      return;
    }

    currentPoints.current.push({ x, y, pressure });

    // Render live stroke directly
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentPoints.current;
    if (pts.length < 2) return;

    ctx.save();
    if (activeTool === 'highlighter') {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth * (width / 800) * 2.5;
      ctx.lineCap = 'square';
    } else {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth * (width / 800);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.beginPath();
    const pPrev = pts[pts.length - 2];
    const pCurr = pts[pts.length - 1];
    ctx.moveTo(pPrev.x * width, pPrev.y * height);
    ctx.lineTo(pCurr.x * width, pCurr.y * height);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }

    if (activeTool === 'eraser') return;

    if (currentPoints.current.length > 1) {
      const newStroke: DrawingStroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        points: [...currentPoints.current],
        color: activeColor,
        width: strokeWidth,
        isHighlighter: activeTool === 'highlighter',
      };

      setUndoStack((prev) => [...prev, strokes]);
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      saveStrokesToDb(updated);
    }

    currentPoints.current = [];
  };

  // Keyboard Undo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault();
          const prev = undoStack[undoStack.length - 1];
          setUndoStack((s) => s.slice(0, -1));
          setStrokes(prev);
          saveStrokesToDb(prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, saveStrokesToDb]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 z-20 ${
        isDrawingActive ? 'cursor-crosshair touch-none' : 'pointer-events-none'
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};
