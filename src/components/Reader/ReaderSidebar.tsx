import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Highlighter,
  Bookmark,
  X,
  Search,
  CheckCircle2,
  Circle,
  RotateCcw,
  Zap,
  ZapOff,
  Trash2,
  FileDown,
  ExternalLink,
  ChevronDown,
  Clock,
} from 'lucide-react';
import type { BookmarkItem, HighlightItem, NoteItem, TocItem } from '../../types';
import {
  countTotalChaptersAndCompleted,
  findActiveChapter,
  getChapterPageProgress,
} from '../../utils/chapterProgress';
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
  completedChapterIds?: string[];
  onToggleChapter?: (id: string) => void;
  readPages?: number[];
  disabledAutoMarkIds?: string[];
  onResetChapter?: (item: TocItem) => void;
  onToggleAutoMark?: (chapterId: string) => void;
  studyTimeSeconds?: number;
}

const TocItemRow: React.FC<{
  item: TocItem;
  currentPage: number;
  onJumpToPage: (page: number) => void;
  depth?: number;
  completedChapterIds?: string[];
  onToggleChapter?: (id: string) => void;
  readPages?: number[];
  disabledAutoMarkIds?: string[];
  onResetChapter?: (item: TocItem) => void;
  onToggleAutoMark?: (chapterId: string) => void;
}> = ({
  item,
  currentPage,
  onJumpToPage,
  depth = 0,
  completedChapterIds = [],
  onToggleChapter,
  readPages = [],
  disabledAutoMarkIds = [],
  onResetChapter,
  onToggleAutoMark,
}) => {
  const hasChildren = item.items && item.items.length > 0;
  const isWithinRange =
    currentPage >= item.pageNumber && currentPage <= (item.endPage || item.pageNumber);
  const [isExpanded, setIsExpanded] = useState<boolean>(isWithinRange);

  useEffect(() => {
    if (isWithinRange) {
      setIsExpanded(true);
    }
  }, [isWithinRange]);

  const isItemCompleted = !!(item.id && completedChapterIds.includes(item.id));
  const pageProgress = getChapterPageProgress(item, readPages, disabledAutoMarkIds);
  const hasMultiplePages = (item.endPage || item.pageNumber) > item.pageNumber;

  // --- Depth 0: Top-Level Chapter Card ---
  if (depth === 0) {
    return (
      <div
        className={`mb-2.5 rounded-2xl border transition-all overflow-hidden ${
          isWithinRange
            ? 'border-purple-300 bg-purple-50/40 shadow-xs ring-1 ring-purple-300/60'
            : isItemCompleted
            ? 'border-emerald-200 bg-emerald-50/20'
            : 'border-purple-200/80 bg-white hover:border-purple-300 shadow-2xs'
        }`}
      >
        {/* Chapter Header Bar */}
        <div className="w-full text-left px-3 py-2 flex items-center justify-between group transition-all">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-transform shrink-0"
                title={isExpanded ? 'Collapse chapter' : 'Expand chapter'}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
            ) : (
              <div className="w-4 h-4 shrink-0" />
            )}

            {/* Chapter study completion checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.id && onToggleChapter) {
                  onToggleChapter(item.id);
                }
              }}
              title={isItemCompleted ? 'Mark as unstudied' : 'Mark as studied'}
              className="p-0.5 text-gray-400 hover:scale-110 active:scale-95 transition-transform shrink-0"
            >
              {isItemCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
              ) : (
                <Circle className="w-4 h-4 text-purple-300 hover:text-purple-600" />
              )}
            </button>

            {/* Chapter Title */}
            <button
              onClick={() => onJumpToPage(item.pageNumber)}
              className={`truncate text-left flex-1 hover:text-purple-800 font-bold text-xs sm:text-[13px] ${
                isItemCompleted ? 'line-through text-gray-400' : 'text-gray-900'
              }`}
              title={item.title}
            >
              {item.title}
            </button>
          </div>

          {/* Action controls & page range */}
          <div className="flex items-center gap-1 shrink-0 pl-1.5">
            {item.id && onToggleAutoMark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAutoMark(item.id!);
                }}
                title={
                  pageProgress.isAutoMarkDisabled
                    ? 'Auto-mark is OFF for this chapter (Click to turn ON)'
                    : 'Auto-mark is ON for this chapter (Click to turn OFF)'
                }
                className={`p-1 rounded transition-all ${
                  pageProgress.isAutoMarkDisabled
                    ? 'text-amber-500 hover:bg-amber-100/70'
                    : 'text-gray-300 hover:text-purple-600 hover:bg-purple-100/50'
                }`}
              >
                {pageProgress.isAutoMarkDisabled ? (
                  <ZapOff className="w-3.5 h-3.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {onResetChapter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResetChapter(item);
                }}
                title={`Reset "${item.title}" progress`}
                className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <span
              className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded-full ${
                isItemCompleted
                  ? 'bg-emerald-100 text-emerald-800'
                  : pageProgress.pagesRead > 0
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
              title={`${pageProgress.pagesRead} of ${pageProgress.totalPages} pages read`}
            >
              {pageProgress.pagesRead}/{pageProgress.totalPages} ({pageProgress.progress}%)
            </span>

            <button
              onClick={() => onJumpToPage(item.pageNumber)}
              className="text-[10px] text-purple-600 font-mono hover:underline pl-0.5"
              title={`Go to page ${item.pageNumber}`}
            >
              p.{item.pageNumber}
              {hasMultiplePages ? `-${item.endPage}` : ''}
            </button>
          </div>
        </div>

        {/* Mini progress bar under chapter header */}
        {hasMultiplePages && (
          <div className="mx-3 pb-2">
            <div className="w-full bg-purple-200/50 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isItemCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                }`}
                style={{ width: `${pageProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Subchapters Container with clear visual separation */}
        {hasChildren && isExpanded && (
          <div className="border-t border-purple-100 bg-purple-50/20 px-3 py-2 space-y-1">
            {item.items!.map((child, cIdx) => (
              <TocItemRow
                key={`${child.title}_${cIdx}`}
                item={child}
                currentPage={currentPage}
                onJumpToPage={onJumpToPage}
                depth={depth + 1}
                completedChapterIds={completedChapterIds}
                onToggleChapter={onToggleChapter}
                readPages={readPages}
                disabledAutoMarkIds={disabledAutoMarkIds}
                onResetChapter={onResetChapter}
                onToggleAutoMark={onToggleAutoMark}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Depth > 0: Nested Subchapters ---
  return (
    <div className="space-y-0.5">
      <div
        className={`w-full text-left px-2 py-1.5 rounded-xl text-xs flex items-center justify-between group transition-all ${
          isWithinRange
            ? 'bg-purple-100/90 text-purple-950 font-semibold shadow-xs border border-purple-200'
            : isItemCompleted
            ? 'bg-emerald-50/50 text-gray-700 hover:bg-purple-50/50'
            : 'hover:bg-purple-100/50 text-gray-700'
        }`}
        style={{ paddingLeft: `${Math.min((depth - 1) * 12 + 4, 32)}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 text-gray-400 hover:text-purple-700 rounded transition-transform shrink-0"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${
                  isExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <span className="text-purple-400 font-mono text-[10px] select-none pl-0.5 shrink-0">↳</span>
          )}

          {/* Subchapter study checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.id && onToggleChapter) {
                onToggleChapter(item.id);
              }
            }}
            title={isItemCompleted ? 'Mark as unstudied' : 'Mark as studied'}
            className="p-0.5 text-gray-400 hover:scale-110 active:scale-95 transition-transform shrink-0"
          >
            {isItemCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-purple-300 hover:text-purple-600" />
            )}
          </button>

          <button
            onClick={() => onJumpToPage(item.pageNumber)}
            className={`truncate text-left flex-1 hover:text-purple-800 text-xs ${
              isItemCompleted ? 'line-through text-gray-400' : ''
            } ${isWithinRange ? 'font-bold text-purple-950' : 'text-gray-700'}`}
            title={item.title}
          >
            {item.title}
          </button>
        </div>

        {/* Section actions & progress */}
        <div className="flex items-center gap-1 shrink-0 pl-1">
          {item.id && onToggleAutoMark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAutoMark(item.id!);
              }}
              title={
                pageProgress.isAutoMarkDisabled
                  ? 'Auto-mark is OFF (Click to turn ON)'
                  : 'Auto-mark is ON (Click to turn OFF)'
              }
              className={`p-0.5 rounded transition-all ${
                pageProgress.isAutoMarkDisabled
                  ? 'text-amber-500'
                  : 'text-gray-300 hover:text-purple-600'
              }`}
            >
              {pageProgress.isAutoMarkDisabled ? (
                <ZapOff className="w-3 h-3" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
            </button>
          )}

          {onResetChapter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetChapter(item);
              }}
              title={`Reset "${item.title}" progress`}
              className="p-0.5 text-gray-300 hover:text-rose-600 rounded transition-all opacity-0 group-hover:opacity-100"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <span
            className={`text-[9px] font-semibold font-mono px-1.5 py-0.2 rounded-full ${
              isItemCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : pageProgress.pagesRead > 0
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-500'
            }`}
            title={`${pageProgress.pagesRead} of ${pageProgress.totalPages} pages read`}
          >
            {pageProgress.pagesRead}/{pageProgress.totalPages}
          </span>

          <button
            onClick={() => onJumpToPage(item.pageNumber)}
            className="text-[10px] text-purple-600 font-mono hover:underline"
            title={`Go to page ${item.pageNumber}`}
          >
            p.{item.pageNumber}
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="pl-3 space-y-0.5">
          {item.items!.map((child, cIdx) => (
            <TocItemRow
              key={`${child.title}_${cIdx}`}
              item={child}
              currentPage={currentPage}
              onJumpToPage={onJumpToPage}
              depth={depth + 1}
              completedChapterIds={completedChapterIds}
              onToggleChapter={onToggleChapter}
              readPages={readPages}
              disabledAutoMarkIds={disabledAutoMarkIds}
              onResetChapter={onResetChapter}
              onToggleAutoMark={onToggleAutoMark}
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
  completedChapterIds = [],
  onToggleChapter,
  readPages = [],
  disabledAutoMarkIds = [],
  onResetChapter,
  onToggleAutoMark,
  studyTimeSeconds,
}) => {
  const [activeTab, setActiveTab] = useState<'toc' | 'notes' | 'bookmarks'>('notes');
  const [searchQuery, setSearchQuery] = useState('');

  const readPagesCount = readPages.length;
  const readProgressPercent = totalPages > 0 ? Math.min(100, Math.round((readPagesCount / totalPages) * 100)) : 0;

  // Chapter and Subchapter progress statistics
  const activeInfo = findActiveChapter(toc, currentPage);
  const activeTarget = activeInfo.subchapter || activeInfo.chapter;
  const isCurrentTargetCompleted = activeTarget?.id ? completedChapterIds.includes(activeTarget.id) : false;
  const activeProgress = activeTarget
    ? getChapterPageProgress(activeTarget, readPages, disabledAutoMarkIds)
    : null;
  const chapterStats = countTotalChaptersAndCompleted(toc, completedChapterIds);

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
          <div className="flex items-center gap-1.5 text-xs pt-0.5">
            <span className="text-purple-700 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <span className="text-purple-300">•</span>
            <span className="text-emerald-700 font-semibold font-mono">
              {readPagesCount} read ({readProgressPercent}%)
            </span>
          </div>
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
          <div className="space-y-3">
            {toc.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-200" />
                No embedded Table of Contents found in this PDF.
              </div>
            ) : (
              <>
                {/* Overall Chapter Mastery Card */}
                <div className="p-3 bg-purple-50/80 border border-purple-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                      Chapter Mastery
                    </span>
                    <span className="font-mono text-[11px] font-bold text-purple-700">
                      {chapterStats.completed} / {chapterStats.total} ({chapterStats.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${chapterStats.percent}%` }}
                    />
                  </div>
                </div>

                {/* Currently Studying Card */}
                {activeInfo.chapter && (
                  <div className="p-3 bg-gradient-to-br from-purple-100/70 to-purple-50 border border-purple-200 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Currently Studying
                      </span>
                      <div className="flex items-center gap-1.5">
                        {activeTarget?.id && onToggleAutoMark && (
                          <button
                            onClick={() => onToggleAutoMark(activeTarget.id!)}
                            title={
                              activeProgress?.isAutoMarkDisabled
                                ? 'Auto-mark is OFF (Click to turn ON)'
                                : 'Auto-mark is ON (Click to turn OFF)'
                            }
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium transition-all ${
                              activeProgress?.isAutoMarkDisabled
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200/70'
                            }`}
                          >
                            {activeProgress?.isAutoMarkDisabled ? (
                              <>
                                <ZapOff className="w-3 h-3 text-amber-600" />
                                <span>Auto: OFF</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-purple-600 fill-purple-600" />
                                <span>Auto: ON</span>
                              </>
                            )}
                          </button>
                        )}

                        {activeTarget && onResetChapter && (
                          <button
                            onClick={() => onResetChapter(activeTarget)}
                            title="Reset reading progress for this section (clears read pages in this section)"
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all border border-purple-200/60"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}

                        {activeTarget && (
                          <button
                            onClick={() => activeTarget.id && onToggleChapter?.(activeTarget.id)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg font-medium transition-all ${
                              isCurrentTargetCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-purple-200/70 text-purple-800 hover:bg-purple-200'
                            }`}
                          >
                            {isCurrentTargetCompleted ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Studied</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3 h-3 text-purple-600" />
                                <span>Mark Studied</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 text-xs truncate">
                        {activeInfo.chapter.title}
                      </h4>
                      {activeInfo.subchapter && (
                        <p className="text-[11px] text-purple-700 font-medium truncate mt-0.5">
                          ↳ {activeInfo.subchapter.title}
                        </p>
                      )}
                    </div>

                    {activeProgress && (
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-600">
                          <span>
                            {activeProgress.pagesRead} of {activeProgress.totalPages} pages completed in this section
                          </span>
                          <span className="font-semibold text-purple-700">{activeProgress.progress}%</span>
                        </div>
                        <div className="w-full bg-purple-200/60 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCurrentTargetCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${activeProgress.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Table of Contents Hierarchical Tree */}
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    All Chapters & Sections
                  </p>
                  {toc.map((item, idx) => (
                    <TocItemRow
                      key={`${item.title}_${idx}`}
                      item={item}
                      currentPage={currentPage}
                      onJumpToPage={onJumpToPage}
                      depth={0}
                      completedChapterIds={completedChapterIds}
                      onToggleChapter={onToggleChapter}
                      readPages={readPages}
                      disabledAutoMarkIds={disabledAutoMarkIds}
                      onResetChapter={onResetChapter}
                      onToggleAutoMark={onToggleAutoMark}
                    />
                  ))}
                </div>
              </>
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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-purple-100/40 border border-purple-200/80 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-purple-700 block">Total Reading Completion</span>
                  <span className="text-xs text-gray-500 font-medium">Pages read out of book</span>
                </div>
                <span className="text-lg font-extrabold text-purple-700">{readProgressPercent}%</span>
              </div>
              <div className="w-full bg-purple-200/70 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${readProgressPercent}%` }}
                />
              </div>

              {/* Two-Column Breakdown: Current Position vs Actual Pages Read */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-purple-50/70 border border-purple-100 p-2.5 rounded-xl">
                  <span className="text-purple-600 block text-[9px] uppercase font-bold tracking-wide">Current View</span>
                  <span className="font-bold text-gray-900 text-xs">Page {currentPage}</span>
                  <span className="text-[10px] text-gray-500 block">of {totalPages} pages</span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl">
                  <span className="text-emerald-700 block text-[9px] uppercase font-bold tracking-wide">Pages Read</span>
                  <span className="font-bold text-gray-900 text-xs">{readPagesCount} pages</span>
                  <span className="text-[10px] text-emerald-600 block font-semibold">{readProgressPercent}% completed</span>
                </div>
              </div>

              {/* Study Time Badge */}
              {studyTimeSeconds !== undefined && studyTimeSeconds > 0 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-100/50 border border-purple-200/60 text-xs">
                  <span className="text-purple-800 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" /> Total Study Time
                  </span>
                  <span className="font-mono font-bold text-purple-900">
                    {Math.floor(studyTimeSeconds / 60)}m {studyTimeSeconds % 60}s
                  </span>
                </div>
              )}

              {/* Mark as Completed Toggle */}
              <button
                onClick={handleCompleteToggle}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 shadow-2xs'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleted ? 'Marked as Completed! 🎉' : 'Mark Book as Completed'}</span>
              </button>
            </div>

            {/* Chapter Mastery Breakdown */}
            {toc.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Chapter Mastery ({chapterStats.completed}/{chapterStats.total})
                  </p>
                  <span className="text-[10px] font-semibold text-purple-600">
                    {chapterStats.percent}%
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {toc.map((chap, cIdx) => {
                    const chapProgress = getChapterPageProgress(chap, readPages, disabledAutoMarkIds);
                    const isChapDone = !!(chap.id && completedChapterIds.includes(chap.id));
                    return (
                      <div
                        key={`${chap.title}_${cIdx}`}
                        className={`p-2 rounded-xl border text-xs transition-all ${
                          isChapDone
                            ? 'bg-emerald-50/40 border-emerald-200 text-gray-800'
                            : 'bg-purple-50/30 border-purple-100 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => chap.id && onToggleChapter?.(chap.id)}
                            className="flex items-center gap-1.5 truncate text-left flex-1"
                          >
                            {isChapDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                            )}
                            <span
                              className={`truncate font-medium ${
                                isChapDone ? 'line-through text-gray-400' : ''
                              }`}
                            >
                              {chap.title}
                            </span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Auto-mark toggle */}
                            {chap.id && onToggleAutoMark && (
                              <button
                                onClick={() => onToggleAutoMark(chap.id!)}
                                title={
                                  chapProgress.isAutoMarkDisabled
                                    ? 'Auto-mark is OFF (Click to turn ON)'
                                    : 'Auto-mark is ON (Click to turn OFF)'
                                }
                                className={`p-0.5 rounded transition-all ${
                                  chapProgress.isAutoMarkDisabled
                                    ? 'text-amber-500'
                                    : 'text-gray-300 hover:text-purple-600'
                                }`}
                              >
                                {chapProgress.isAutoMarkDisabled ? (
                                  <ZapOff className="w-3 h-3" />
                                ) : (
                                  <Zap className="w-3 h-3" />
                                )}
                              </button>
                            )}

                            {/* Reset button */}
                            {onResetChapter && (
                              <button
                                onClick={() => onResetChapter(chap)}
                                title={`Reset "${chap.title}" progress`}
                                className="p-0.5 text-gray-300 hover:text-rose-600 rounded transition-all"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => onJumpToPage(chap.pageNumber)}
                              className="text-[10px] text-purple-600 font-mono shrink-0 hover:underline"
                              title={`Go to page ${chap.pageNumber}`}
                            >
                              p.{chap.pageNumber}
                            </button>
                          </div>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 bg-purple-200/50 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isChapDone ? 'bg-emerald-500' : 'bg-purple-600'
                              }`}
                              style={{ width: `${chapProgress.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono shrink-0">
                            {chapProgress.pagesRead}/{chapProgress.totalPages} ({chapProgress.progress}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
