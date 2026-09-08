import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Highlighter,
  UploadCloud,
  Loader2,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import type { Book } from '../../types';
import { BookCard } from './BookCard';
import { generatePdfThumbnail, loadPdfDocument } from '../../services/pdfService';
import { saveBook } from '../../services/db';
import {
  isGoogleSignedIn,
  getSavedUserProfile,
  scheduleAutoSync,
} from '../../services/googleDrive';

interface LibraryDashboardProps {
  books: Book[];
  totalNotes: number;
  totalHighlights: number;
  onOpenBook: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  onToggleComplete: (id: string, current: boolean) => void;
  onOpenSearch: () => void;
  onOpenSync: () => void;
  onRefreshBooks: () => void;
}

export const LibraryDashboard: React.FC<LibraryDashboardProps> = ({
  books,
  totalNotes,
  totalHighlights,
  onOpenBook,
  onDeleteBook,
  onToggleComplete,
  onOpenSearch,
  onOpenSync,
  onRefreshBooks,
}) => {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const userProfile = isGoogleSignedIn() ? getSavedUserProfile() : null;

  // Filter books
  const filteredBooks = books.filter((b) => {
    if (filter === 'completed') return b.isCompleted;
    if (filter === 'in_progress') return !b.isCompleted && b.currentPage > 1;
    return true;
  });

  // Calculate stats
  const totalPagesRead = books.reduce((acc, b) => acc + (b.currentPage || 1), 0);
  const completedCount = books.filter((b) => b.isCompleted).length;

  // Process and add a new textbook file
  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    setIsUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await loadPdfDocument(arrayBuffer);
      const totalPages = pdfDoc.numPages;
      const coverDataUrl = await generatePdfThumbnail(pdfDoc);

      const title = file.name.replace(/\.pdf$/i, '');
      const newBook: Book = {
        id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        totalPages,
        currentPage: 1,
        progress: 0,
        fileSize: file.size,
        addedAt: Date.now(),
        lastReadAt: Date.now(),
        isCompleted: false,
        coverDataUrl,
        pdfBlob: file, // Cached in browser IndexedDB
      };

      await saveBook(newBook);
      onRefreshBooks();
      scheduleAutoSync(2000);
    } catch (err) {
      console.error('Failed to parse PDF textbook:', err);
      alert('Failed to process PDF. Please try another file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePdfUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePdfUpload(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FD]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-purple-100/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
              StudyBookHub
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                Local-First
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Your private study notebook, textbook reader, and drawing desk
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100/80 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/60 transition-all"
            title="Search textbooks and notes"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search (Notes & Books)</span>
          </button>

          {/* Cloud Sync / Google Profile Pill */}
          {userProfile ? (
            <button
              onClick={onOpenSync}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-white hover:bg-purple-50 text-gray-800 rounded-xl border border-purple-200/80 shadow-2xs transition-all"
              title="Google Drive Sync Connected - Click to view status or backup"
            >
              {userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userProfile.name}
                  className="w-5 h-5 rounded-full border border-purple-300 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold max-w-[85px] truncate hidden sm:inline">
                  {userProfile.name.split(' ')[0]}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected to Google Drive AppData" />
              </div>
            </button>
          ) : (
            <button
              onClick={onOpenSync}
              className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/80 shadow-2xs transition-all"
              title="Sign in with Google to sync notes across devices"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span className="hidden sm:inline">Google Sync</span>
            </button>
          )}

          {/* Add Textbook Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>Add Textbook</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Study Stats Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white rounded-3xl border border-purple-100/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-gray-900">{books.length}</p>
              <p className="text-[11px] font-medium text-gray-500">Textbooks in Shelf</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-purple-100/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-violet-100 text-violet-700 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-gray-900">{totalPagesRead}</p>
              <p className="text-[11px] font-medium text-gray-500">Pages Studied</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-purple-100/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-fuchsia-100 text-fuchsia-700 rounded-2xl">
              <Highlighter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-gray-900">
                {totalNotes + totalHighlights}
              </p>
              <p className="text-[11px] font-medium text-gray-500">Notes & Highlights</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-3xl border border-purple-100/80 shadow-xs flex items-center gap-3.5">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-gray-900">{completedCount}</p>
              <p className="text-[11px] font-medium text-gray-500">Books Completed</p>
            </div>
          </div>
        </div>

        {/* Drag & Drop Quick Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-purple-600 bg-purple-100/60 scale-[1.005]'
              : 'border-purple-200 bg-purple-50/30 hover:bg-purple-50/70 hover:border-purple-300'
          }`}
        >
          <div className="p-3 bg-white text-purple-600 rounded-2xl shadow-xs border border-purple-100">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-gray-800">
              Drag & Drop your textbook PDF here, or click to browse
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Files are saved locally in your browser (never sent to any external server)
            </p>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-purple-100/80 shadow-xs text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-700'
              }`}
            >
              All Textbooks ({books.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filter === 'in_progress'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-700'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filter === 'completed'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-purple-700'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <span className="text-xs font-medium text-gray-400 hidden sm:inline">
            Showing {filteredBooks.length} of {books.length}
          </span>
        </div>

        {/* Bookshelf Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-purple-100/60 p-8 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Your Bookshelf is Empty</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Add your syllabus, textbooks, course PDFs, or research papers above to start reading, drawing notes, and tracking your study journey.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Select a PDF Textbook</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={onOpenBook}
                onDelete={onDeleteBook}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
