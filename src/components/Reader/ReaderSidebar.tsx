import React, { useState } from 'react';
import {
  BookOpen,
  Highlighter,
  Bookmark,
  X,
  Search,
  CheckCircle2,
  Trash2,
  FileDown,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import type { BookmarkItem, HighlightItem, NoteItem, TocItem } from '../../types';
import confetti from 'canvas-confetti';

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages: number;
  onJumpToPage: (page: number) => void;
  onJumpToHighlight?: (pageNumber: number, highlightId: string) => void;
  toc: TocItem[];
  highlights: HighlightItem[];
  notes: NoteItem[];
  bookmarks: BookmarkItem[];
  onDeleteHighlight: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  bookTitle: string;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
}

const TocItemRow: React.FC<{
  item: TocItem;
  currentPage: number;
  onJumpToPage: (page: number) => void;
  depth?: number;
}> = ({ item, currentPage, onJumpToPage, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.items && item.items.length > 0;
  const isCurrent = currentPage === item.pageNumber;

  return (
    <div className="space-y-0.5">
      <div
        className={`w-full text-left px-2 py-1.5 rounded-xl text-xs flex items-center justify-between group transition-all ${
          isCurrent
            ? 'bg-purple-100 text-purple-950 font-bold shadow-xs'
            : 'hover:bg-purple-50 text-gray-700'
        }`}
        style={{ paddingLeft: `${Math.min(depth * 12 + 6, 44)}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 text-gray-400 hover:text-purple-700 rounded transition-transform"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <div className="w-3.5 h-3.5 shrink-0" />
          )}

          <button
            onClick={() => onJumpToPage(item.pageNumber)}
            className="truncate text-left flex-1 hover:text-purple-800"
            title={item.title}
          >
            {item.title}
          </button>
        </div>

        <button
          onClick={() => onJumpToPage(item.pageNumber)}
          className="text-[10px] text-purple-600 font-mono shrink-0 pl-1.5 hover:underline"
        >
          p.{item.pageNumber}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-0.5">
          {item.items!.map((child, cIdx) => (
            <TocItemRow
              key={`${child.title}_${cIdx}`}
              item={child}
              currentPage={currentPage}
              onJumpToPage={onJumpToPage}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
  isOpen,
  onClose,
  currentPage,
  totalPages,
  onJumpToPage,
  onJumpToHighlight,
  toc,
  highlights,
  notes,
  bookmarks,
  onDeleteHighlight,
  onDeleteNote,
  onDeleteBookmark,
  bookTitle,
  isCompleted,
  onToggleCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'notes' | 'bookmarks'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Trigger celebratory confetti when completing a textbook
  const handleCompleteToggle = () => {
    if (!isCompleted) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#C084FC', '#E9D5FF', '#F43F5E', '#10B981'],
      });
    }
    onToggleCompleted?.();
  };

  // Export notes and highlights as Markdown
  const exportNotesMarkdown = () => {
    let md = `# Study Notes: ${bookTitle}\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    if (highlights.length > 0) {
      md += `## Highlights\n\n`;
      highlights.forEach((h) => {
        md += `> "${h.text}"\n\n`;
        md += `*— Page ${h.pageNumber}*`;
        if (h.note) md += `\n*Note: ${h.note}*`;
        md += `\n\n`;
      });
    }

    if (notes.length > 0) {
      md += `## Notes\n\n`;
      notes.forEach((n) => {
        md += `### Page ${n.pageNumber}\n`;
        md += `${n.content}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter annotations based on search query
  const filteredHighlights = highlights.filter(
    (h) =>
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredNotes = notes.filter((n) =>
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <aside className="fixed top-0 right-0 h-full w-84 sm:w-96 max-w-[90vw] bg-white shadow-2xl border-l border-purple-100 z-50 flex flex-col transition-transform animate-in slide-in-from-right duration-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
        <div>
          <h2 className="font-bold text-gray-900 text-sm truncate max-w-[220px]">
            {bookTitle}
          </h2>
          <p className="text-xs text-purple-600 font-medium">
            Page {currentPage} of {totalPages} ({progressPercent}%)
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-purple-100/50 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 border-b border-purple-100 bg-purple-50/20 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('toc')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'toc'
              ? 'border-purple-600 text-purple-700 bg-white'
              : 'border-transparent text-gray-500 hover:text-purple-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Chapters</span>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'notes'
              ? 'border-purple-600 text-purple-700 bg-white'
              : 'border-transparent text-gray-500 hover:text-purple-600'
          }`}
        >
          <Highlighter className="w-4 h-4" />
          <span>Notes ({highlights.length + notes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'bookmarks'
              ? 'border-purple-600 text-purple-700 bg-white'
              : 'border-transparent text-gray-500 hover:text-purple-600'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Progress</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Table of Contents */}
        {activeTab === 'toc' && (
          <div className="space-y-1">
            {toc.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-200" />
                No embedded Table of Contents found in this PDF.
              </div>
            ) : (
              <div className="space-y-1">
                {toc.map((item, idx) => (
                  <TocItemRow
                    key={`${item.title}_${idx}`}
                    item={item}
                    currentPage={currentPage}
                    onJumpToPage={onJumpToPage}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes & Highlights Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {/* Search within notes */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes & highlights..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-purple-50/50 border border-purple-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
              />
            </div>

            {/* Export Markdown Action */}
            {(highlights.length > 0 || notes.length > 0) && (
              <button
                onClick={exportNotesMarkdown}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium rounded-xl border border-purple-200 transition-all"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Study Notes (.md)</span>
              </button>
            )}

            {/* Highlights List */}
            {filteredHighlights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Highlights
                </p>
                {filteredHighlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-2.5 rounded-xl border border-purple-100/80 bg-purple-50/30 hover:bg-purple-50 text-xs space-y-1 group transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: `${hl.color}33`, color: hl.color }}
                      >
                        Page {hl.pageNumber}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() =>
                            onJumpToHighlight
                              ? onJumpToHighlight(hl.pageNumber, hl.id)
                              : onJumpToPage(hl.pageNumber)
                          }
                          title="Jump to highlight"
                          className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteHighlight(hl.id)}
                          title="Delete highlight"
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p
                      onClick={() =>
                        onJumpToHighlight
                          ? onJumpToHighlight(hl.pageNumber, hl.id)
                          : onJumpToPage(hl.pageNumber)
                      }
                      className="cursor-pointer text-gray-700 italic border-l-2 border-purple-300 pl-2 line-clamp-3 hover:text-purple-900"
                    >
                      "{hl.text}"
                    </p>
                    {hl.note && (
                      <p className="text-purple-800 bg-white/80 p-1.5 rounded-lg border border-purple-100 text-[11px]">
                        📝 {hl.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Margin / Page Notes */}
            {filteredNotes.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Page Notes
                </p>
                {filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl border border-purple-100 bg-white shadow-xs text-xs space-y-1 group hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        Page {n.pageNumber}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onJumpToPage(n.pageNumber)}
                          className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(n.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p
                      onClick={() => onJumpToPage(n.pageNumber)}
                      className="text-gray-800 cursor-pointer hover:text-purple-700 whitespace-pre-wrap"
                    >
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {filteredHighlights.length === 0 && filteredNotes.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-xs">
                <Highlighter className="w-8 h-8 mx-auto mb-2 text-purple-200" />
                No notes or highlights yet.<br />Select text to highlight or add margin notes!
              </div>
            )}
          </div>
        )}

        {/* Bookmarks & Study Progress Tab */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            {/* Progress Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-900">Study Progress</span>
                <span className="text-sm font-extrabold text-purple-700">{progressPercent}%</span>
              </div>
              <div className="w-full bg-purple-200/70 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-600">
                You are currently on page <strong className="text-purple-800">{currentPage}</strong> of {totalPages}.
              </p>

              {/* Mark as Completed Toggle */}
              <button
                onClick={handleCompleteToggle}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleted ? 'Marked as Completed! 🎉' : 'Mark Book as Completed'}</span>
              </button>
            </div>

            {/* Bookmarks List */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Saved Bookmarks ({bookmarks.length})
              </p>
              {bookmarks.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  <Bookmark className="w-6 h-6 mx-auto mb-1 text-purple-200" />
                  No bookmarks saved yet. Click the bookmark icon in the top bar to pin pages!
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-purple-100 hover:bg-purple-50 text-xs group transition-all"
                  >
                    <button
                      onClick={() => onJumpToPage(bm.pageNumber)}
                      className="flex items-center gap-2 text-left truncate flex-1 text-gray-700 hover:text-purple-700"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-purple-500 fill-purple-500 shrink-0" />
                      <span className="truncate">{bm.label}</span>
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bm.id)}
                      className="p-1 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
