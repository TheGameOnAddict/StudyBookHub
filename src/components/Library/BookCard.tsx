import React, { useState } from 'react';
import {
  BookOpen,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import type { Book } from '../../types';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, current: boolean) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpen,
  onDelete,
  onToggleComplete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Format last studied relative time
  const formatTime = (timestamp: number) => {
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-3xl p-4 border border-purple-100/80 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300">
      {/* Cover / Preview Box */}
      <div
        onClick={() => onOpen(book)}
        className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-100 to-purple-50 cursor-pointer flex items-center justify-center group-hover:scale-[1.02] transition-transform"
      >
        {book.coverDataUrl ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <BookOpen className="w-12 h-12 text-purple-400" />
            <span className="text-xs font-semibold text-purple-700 line-clamp-2">
              {book.title}
            </span>
          </div>
        )}

        {/* Completion Badge */}
        {book.isCompleted && (
          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white p-1 rounded-full shadow-md backdrop-blur-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}

        {/* Floating Quick Action Overlay */}
        <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(book);
            }}
            className="px-4 py-2 bg-white text-purple-900 text-xs font-bold rounded-xl shadow-lg hover:bg-purple-50 transition-all flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Read Now</span>
          </button>
        </div>
      </div>

      {/* Book Information */}
      <div className="pt-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3
              onClick={() => onOpen(book)}
              title={book.title}
              className="font-bold text-sm text-gray-900 line-clamp-1 hover:text-purple-700 cursor-pointer transition-colors"
            >
              {book.title}
            </h3>

            {/* Options Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  onMouseLeave={() => setShowMenu(false)}
                  className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-2xl shadow-xl border border-purple-100 py-1.5 z-30 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleComplete(book.id, !!book.isCompleted);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-purple-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{book.isCompleted ? 'Mark as In Progress' : 'Mark as Completed'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(book.id);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove from Shelf</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-purple-400" />
              {book.totalPages} pages
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              {formatTime(book.lastReadAt)}
            </span>
            {book.completedChapters && book.completedChapters.length > 0 && (
              <>
                <span>•</span>
                <span className="text-emerald-600 font-medium">
                  {book.completedChapters.length} studied
                </span>
              </>
            )}
          </div>
        </div>

        {/* Reading Progress Indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 font-medium">Page {book.currentPage}</span>
            <span className="font-bold text-purple-700">{book.progress}%</span>
          </div>
          <div className="w-full bg-purple-100/70 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                book.isCompleted
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-purple-500 to-purple-600'
              }`}
              style={{ width: `${book.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
