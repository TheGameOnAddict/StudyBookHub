import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Book } from './types';
import {
  deleteBook,
  getAllBooks,
  getBook,
  saveBook,
  db,
} from './services/db';
import { LibraryDashboard } from './components/Library/LibraryDashboard';
import { PdfViewer } from './components/Reader/PdfViewer';
import { SearchModal } from './components/Modals/SearchModal';
import { SyncModal } from './components/Modals/SyncModal';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'reader'>('library');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activePage, setActivePage] = useState<number>(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [totalNotes, setTotalNotes] = useState<number>(0);
  const [totalHighlights, setTotalHighlights] = useState<number>(0);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [initialHighlightId, setInitialHighlightId] = useState<string | null>(null);

  // Fallback file picker for unlinked books
  const fallbackFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBookToLink, setPendingBookToLink] = useState<Book | null>(null);

  // Refresh books and global counters from IndexedDB
  const refreshLibrary = useCallback(async () => {
    try {
      const allBooks = await getAllBooks();
      const notesCount = await db.notes.count();
      const highlightsCount = await db.highlights.count();
      setBooks(allBooks);
      setTotalNotes(notesCount);
      setTotalHighlights(highlightsCount);
    } catch (err) {
      console.error('Failed to load library data:', err);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // Open book handler
  const handleOpenBook = async (book: Book, targetPage?: number) => {
    // If book has a locally cached PDF blob
    if (book.pdfBlob) {
      setActiveBook(book);
      setActivePage(targetPage || book.currentPage || 1);
      setCurrentView('reader');
    } else {
      // Need user to pick the local PDF file for this book on this device
      setPendingBookToLink(book);
      fallbackFileInputRef.current?.click();
    }
  };

  // Re-link PDF file if not cached
  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingBookToLink) return;

    const updatedBook: Book = {
      ...pendingBookToLink,
      pdfBlob: file,
    };
    await saveBook(updatedBook);
    setActiveBook(updatedBook);
    setActivePage(pendingBookToLink.currentPage || 1);
    setCurrentView('reader');
    setPendingBookToLink(null);
    refreshLibrary();
    e.target.value = '';
  };

  // Delete book handler
  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to remove this textbook and all its notes and drawings?')) {
      await deleteBook(id);
      refreshLibrary();
    }
  };

  // Toggle completion handler
  const handleToggleComplete = async (id: string, current: boolean) => {
    const book = await getBook(id);
    if (book) {
      const updated: Book = {
        ...book,
        isCompleted: !current,
        progress: !current ? 100 : book.progress,
      };
      await saveBook(updated);
      refreshLibrary();
    }
  };

  // Handle select search result
  const handleSelectSearchResult = async (bookId: string, pageNumber: number, highlightId?: string) => {
    const book = await getBook(bookId);
    if (book) {
      setInitialHighlightId(highlightId || null);
      handleOpenBook(book, pageNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#232034] font-sans antialiased">
      {/* Hidden file input for linking PDF */}
      <input
        ref={fallbackFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFallbackFile}
        className="hidden"
      />

      {currentView === 'library' ? (
        <LibraryDashboard
          books={books}
          totalNotes={totalNotes}
          totalHighlights={totalHighlights}
          onOpenBook={(b) => handleOpenBook(b)}
          onDeleteBook={handleDeleteBook}
          onToggleComplete={handleToggleComplete}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSync={() => setIsSyncOpen(true)}
          onRefreshBooks={refreshLibrary}
        />
      ) : activeBook && activeBook.pdfBlob ? (
        <PdfViewer
          bookId={activeBook.id}
          bookTitle={activeBook.title}
          initialPage={activePage}
          initialHighlightId={initialHighlightId}
          pdfSource={activeBook.pdfBlob}
          isCompleted={activeBook.isCompleted}
          onBackToLibrary={() => {
            setCurrentView('library');
            setActiveBook(null);
            setInitialHighlightId(null);
            refreshLibrary();
          }}
        />
      ) : null}

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Cloud Sync & Backup Modal */}
      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onDataChanged={refreshLibrary}
      />
    </div>
  );
};

export default App;
