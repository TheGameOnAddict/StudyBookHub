import React, { useState } from 'react';
import { Highlighter, MessageSquarePlus, X } from 'lucide-react';

interface TextHighlightTooltipProps {
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: string, note?: string) => void;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Lavender', hex: '#C4B5FD', bg: 'bg-purple-300' },
  { name: 'Yellow', hex: '#FDE047', bg: 'bg-yellow-300' },
  { name: 'Mint', hex: '#6EE7B7', bg: 'bg-emerald-300' },
  { name: 'Rose', hex: '#FDA4AF', bg: 'bg-rose-300' },
  { name: 'Cyan', hex: '#7DD3FC', bg: 'bg-sky-300' },
];

export const TextHighlightTooltip: React.FC<TextHighlightTooltipProps> = ({
  position,
  selectedText,
  onHighlight,
  onClose,
}) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].hex);

  const handleApply = (colorHex: string) => {
    onHighlight(colorHex, noteContent.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-purple-900/15 border border-purple-200 p-2 text-xs flex flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Highlighter className="w-3.5 h-3.5 text-purple-600" />
          <span className="font-semibold text-gray-700 truncate max-w-[150px]" title={selectedText}>
            "{selectedText}"
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color swatches */}
      <div className="flex items-center gap-1.5 px-1">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => {
              setSelectedColor(c.hex);
              if (!isAddingNote) {
                handleApply(c.hex);
              }
            }}
            title={`Highlight with ${c.name}`}
            className={`w-6 h-6 rounded-full transition-transform hover:scale-115 flex items-center justify-center ${
              selectedColor === c.hex ? 'ring-2 ring-purple-600 scale-105' : ''
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}

        <div className="w-px h-4 bg-purple-200 mx-0.5" />

        <button
          onClick={() => setIsAddingNote(!isAddingNote)}
          title="Add a note to this highlight"
          className={`p-1.5 rounded-xl transition-all ${
            isAddingNote
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </div>

      {/* Optional Note input */}
      {isAddingNote && (
        <div className="pt-1 border-t border-purple-100 flex flex-col gap-1.5 px-1">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add note for this highlight..."
            rows={2}
            autoFocus
            className="w-full text-xs p-1.5 bg-purple-50/50 border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <button
            onClick={() => handleApply(selectedColor)}
            className="self-end px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-[11px] transition-all"
          >
            Save Highlight & Note
          </button>
        </div>
      )}
    </div>
  );
};
