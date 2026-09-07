import React from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Hand,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { DrawingTool } from '../../types';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  isDrawingActive: boolean;
  setIsDrawingActive: (active: boolean) => void;
  onClearPage?: () => void;
  onUndo?: () => void;
}

const PALETTE_COLORS = [
  { label: 'Lavender', hex: '#8B5CF6' },
  { label: 'Violet', hex: '#6D28D9' },
  { label: 'Sky', hex: '#38BDF8' },
  { label: 'Mint', hex: '#10B981' },
  { label: 'Gold', hex: '#F59E0B' },
  { label: 'Rose', hex: '#F43F5E' },
  { label: 'Obsidian', hex: '#1E1B4B' },
];

const STROKE_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Bold', size: 8 },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  strokeWidth,
  setStrokeWidth,
  isDrawingActive,
  setIsDrawingActive,
  onClearPage,
  onUndo,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-100 max-w-[95vw] transition-all">
      {/* Mode Switch: Pan/Read vs Draw */}
      <div className="flex items-center bg-purple-50/80 p-1 rounded-xl border border-purple-100">
        <button
          onClick={() => setIsDrawingActive(false)}
          title="Scroll & Read Mode (Pinch to zoom & touch scroll)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !isDrawingActive
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-500 hover:text-purple-600'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Scroll</span>
        </button>
        <button
          onClick={() => setIsDrawingActive(true)}
          title="Draw / Stylus Mode"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isDrawingActive
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-purple-600'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
          <span>Draw</span>
        </button>
      </div>

      <div className="h-5 w-px bg-purple-200 hidden sm:block" />

      {/* Tools: Pen, Highlighter, Eraser */}
      <div className={`flex items-center gap-1 transition-opacity ${!isDrawingActive ? 'opacity-40 pointer-events-none' : ''}`}>
        <button
          onClick={() => setActiveTool('pen')}
          title="Pen (Stylus & Finger)"
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'pen'
              ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <Pen className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool('highlighter')}
          title="Highlighter"
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'highlighter'
              ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <Highlighter className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool('eraser')}
          title="Stroke Eraser"
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'eraser'
              ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-purple-200 hidden sm:block" />

      {/* Color Palette */}
      {activeTool !== 'eraser' && (
        <div className={`flex items-center gap-1.5 transition-opacity ${!isDrawingActive ? 'opacity-40 pointer-events-none' : ''}`}>
          {PALETTE_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setActiveColor(c.hex)}
              title={c.label}
              className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${
                activeColor === c.hex ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : ''
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      <div className="h-5 w-px bg-purple-200 hidden md:block" />

      {/* Stroke Sizes */}
      {activeTool !== 'eraser' && (
        <div className={`hidden md:flex items-center gap-1 transition-opacity ${!isDrawingActive ? 'opacity-40 pointer-events-none' : ''}`}>
          {STROKE_SIZES.map((s) => (
            <button
              key={s.size}
              onClick={() => setStrokeWidth(s.size)}
              title={`${s.label} Stroke`}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                strokeWidth === s.size
                  ? 'bg-purple-100 text-purple-900 font-semibold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: `${s.size * 2 + 4}px`, height: `${s.size * 2 + 4}px` }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Undo & Clear */}
      <div className="flex items-center gap-1 ml-auto">
        {onUndo && (
          <button
            onClick={onUndo}
            title="Undo Last Stroke"
            className="p-2 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {onClearPage && (
          <button
            onClick={onClearPage}
            title="Clear Page Drawings"
            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
