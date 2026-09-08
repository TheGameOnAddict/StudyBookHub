import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Trash2,
  Edit3,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { HighlightItem } from '../../types';

interface HighlightNotePopoverProps {
  highlight: HighlightItem;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdateNote: (highlightId: string, newNote: string) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onOpenInSidebar?: () => void;
}

export const HighlightNotePopover: React.FC<HighlightNotePopoverProps> = ({
  highlight,
  position,
  onClose,
  onUpdateNote,
  onDeleteHighlight,
  onOpenInSidebar,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState(highlight.note || '');

  const handleSave = () => {
    onUpdateNote(highlight.id, editedNote.trim());
    setIsEditing(false);
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-purple-900/20 border border-purple-200 p-3 text-xs flex flex-col gap-2.5 w-72 sm:w-80 max-w-[90vw] animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${Math.max(160, Math.min(window.innerWidth - 160, position.x))}px`,
        top: `${Math.max(100, position.y)}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
            style={{ backgroundColor: highlight.color }}
          />
          <span className="font-bold text-gray-800 text-xs">
            Highlight • Page {highlight.pageNumber}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onOpenInSidebar && (
            <button
              onClick={onOpenInSidebar}
              title="Show in sidebar"
              className="p-1 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quoted Highlight Excerpt */}
      <div className="p-2 bg-purple-50/40 rounded-xl border border-purple-100/60 max-h-24 overflow-y-auto">
        <p className="text-[11px] text-gray-700 italic border-l-2 border-purple-400 pl-2 leading-relaxed">
          "{highlight.text}"
        </p>
      </div>

      {/* Attached Note Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-purple-700 font-semibold text-[11px]">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Attached Note</span>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-1 font-semibold"
            >
              <Edit3 className="w-3 h-3" />
              <span>{highlight.note ? 'Edit' : 'Add Note'}</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              placeholder="Write your note or explanation here..."
              rows={3}
              autoFocus
              className="w-full text-xs p-2 bg-purple-50/50 border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => {
                  setEditedNote(highlight.note || '');
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-semibold shadow-xs"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {highlight.note ? (
              <p className="text-xs text-gray-800 bg-white p-2.5 rounded-xl border border-purple-100 shadow-xs whitespace-pre-wrap leading-relaxed">
                {highlight.note}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 italic py-1">
                No note attached. Click "Add Note" to write one.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-purple-100 text-[11px]">
        <button
          onClick={() => {
            if (confirm('Delete this highlight?')) {
              onDeleteHighlight(highlight.id);
              onClose();
            }
          }}
          className="flex items-center gap-1 text-rose-500 hover:text-rose-700 font-medium p-1 hover:bg-rose-50 rounded-lg transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Highlight</span>
        </button>
        <span className="text-[10px] text-gray-400">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
