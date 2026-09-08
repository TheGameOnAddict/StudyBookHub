import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  PanelRight,
  FileEdit,
} from 'lucide-react';
import { StudyTimer } from './StudyTimer';

interface ReaderNavbarProps {
  bookId: string;
  title: string;
  currentPage: number;
  totalPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onBackToLibrary: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onOpenAddNote: () => void;
  notesCount: number;
  initialStudyTimeSeconds?: number;
  onStudyTimeUpdate?: (totalSeconds: number) => void;
}

export const ReaderNavbar: React.FC<ReaderNavbarProps> = ({
  bookId,
  title,
  currentPage,
  totalPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onBackToLibrary,
  onToggleSidebar,
  isSidebarOpen,
  isBookmarked,
  onToggleBookmark,
  onOpenAddNote,
  notesCount,
  initialStudyTimeSeconds,
  onStudyTimeUpdate,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onBackToLibrary}
          title="Back to Bookshelf"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Bookshelf</span>
        </button>
        <h1 className="text-xs sm:text-sm font-bold text-gray-800 truncate max-w-[140px] sm:max-w-[280px] md:max-w-md">
          {title}
        </h1>
      </div>

      {/* Center: Page Jump Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center gap-1 text-xs">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-10 sm:w-12 text-center py-1 bg-purple-50/70 border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-gray-400 font-medium">/ {totalPages || 1}</span>
        </form>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Study Timer, Zoom & Sidebar Toggles */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Study Focus Timer */}
        <StudyTimer
          bookId={bookId}
          initialStudyTimeSeconds={initialStudyTimeSeconds}
          onStudyTimeUpdate={onStudyTimeUpdate}
        />

        {/* Zoom Controls (hidden on very small phones, visible on tablets/desktops) */}
        <div className="hidden md:flex items-center gap-1 bg-purple-50/50 p-1 rounded-xl border border-purple-100 text-xs">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 text-gray-600 hover:text-purple-700 hover:bg-white rounded-lg transition-all"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-semibold text-purple-800 px-1 w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 text-gray-600 hover:text-purple-700 hover:bg-white rounded-lg transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            title="Fit Width"
            className="p-1.5 text-gray-600 hover:text-purple-700 hover:bg-white rounded-lg transition-all ml-0.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Add Margin Note */}
        <button
          onClick={onOpenAddNote}
          title="Add Note to this page"
          className="p-2 text-purple-700 hover:bg-purple-50 rounded-xl transition-all"
        >
          <FileEdit className="w-4 h-4" />
        </button>

        {/* Bookmark Toggle */}
        <button
          onClick={onToggleBookmark}
          title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
          className={`p-2 rounded-xl transition-all ${
            isBookmarked
              ? 'text-purple-600 bg-purple-100 fill-purple-600'
              : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>

        {/* Sidebar Open/Close */}
        <button
          onClick={onToggleSidebar}
          title="Open Notes, Chapters & Progress"
          className={`relative p-2 rounded-xl transition-all ${
            isSidebarOpen
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <PanelRight className="w-4 h-4" />
          {notesCount > 0 && !isSidebarOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {notesCount > 9 ? '9+' : notesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
