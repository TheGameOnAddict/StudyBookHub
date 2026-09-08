import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  extractPdfOutline,
  loadPdfDocument,
} from '../../services/pdfService';
import {
  addHighlight,
  deleteBookmark,
  deleteHighlight,
  deleteNote,
  getBookmarks,
  getBookHighlights,
  getBookNotes,
  getBook,
  saveBook,
  toggleChapterCompleted,
  recordPageVisit,
  resetChapterProgress,
  toggleAutoMarkChapter,
  isBookmarked as checkIsBookmarked,
  saveNote,
  savePageDrawings,
  toggleBookmark,
  saveChapterQuizScore,
} from '../../services/db';
import type {
  BookmarkItem,
  ChapterQuizScore,
  DrawingTool,
  HighlightItem,
  HighlightRect,
  NoteItem,
  TocItem,
} from '../../types';
import { findActiveChapter } from '../../utils/chapterProgress';
import { ReaderNavbar } from './ReaderNavbar';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawingCanvas } from './DrawingCanvas';
import { ReaderSidebar } from './ReaderSidebar';
import { TextHighlightTooltip } from './TextHighlightTooltip';
import { HighlightNotePopover } from './HighlightNotePopover';
import { QuizModal } from './QuizModal';
import { FileText, Loader2, Sparkles } from 'lucide-react';

interface PdfViewerProps {
  bookId: string;
  bookTitle: string;
  initialPage?: number;
  initialHighlightId?: string | null;
  pdfSource: Blob | ArrayBuffer;
  onBackToLibrary: () => void;
  isCompleted?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  bookId,
  bookTitle,
  initialPage = 1,
  initialHighlightId = null,
  pdfSource,
  onBackToLibrary,
  isCompleted: initialIsCompleted = false,
}) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sidebar & metadata states
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(initialIsCompleted);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [readPages, setReadPages] = useState<number[]>([]);
  const [disabledAutoMarkChapters, setDisabledAutoMarkChapters] = useState<string[]>([]);
  const [studyTimeSeconds, setStudyTimeSeconds] = useState<number>(0);
  const [quizScores, setQuizScores] = useState<Record<string, ChapterQuizScore>>({});
  const [quizModalState, setQuizModalState] = useState<{
    isOpen: boolean;
    chapter: TocItem | null;
  }>({ isOpen: false, chapter: null });

  // Drawing state
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [activeColor, setActiveColor] = useState<string>('#8B5CF6'); // Lavender
  const [strokeWidth, setStrokeWidth] = useState<number>(4);

  // Text selection highlight state
  const [selectionTooltip, setSelectionTooltip] = useState<{
    x: number;
    y: number;
    text: string;
    rects: HighlightRect[];
  } | null>(null);

  // Pulsing highlight state
  const [pulsingHighlightId, setPulsingHighlightId] = useState<string | null>(initialHighlightId || null);

  // Clicked highlight note popover state
  const [activePopoverHighlight, setActivePopoverHighlight] = useState<{
    highlight: HighlightItem;
    x: number;
    y: number;
  } | null>(null);

  // Quick note dialog state
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    loadPdfDocument(pdfSource)
      .then(async (doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoading(false);

        // Extract TOC outline
        const outline = await extractPdfOutline(doc);
        if (isMounted) setToc(outline);
      })
      .catch((err) => {
        console.error('Error loading PDF document:', err);
        if (isMounted) {
          setErrorMessage('Could not load textbook file. Please verify it is a valid PDF.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pdfSource]);

  // Refresh book annotations (highlights, notes, bookmarks)
  const refreshAnnotations = useCallback(async () => {
    try {
      const [hls, nts, bms, bkmkState] = await Promise.all([
        getBookHighlights(bookId),
        getBookNotes(bookId),
        getBookmarks(bookId),
        checkIsBookmarked(bookId, currentPage),
      ]);
      setHighlights(hls);
      setNotes(nts);
      setBookmarks(bms);
      setIsCurrentBookmarked(bkmkState);
    } catch (e) {
      console.warn('Failed to refresh annotations:', e);
    }
  }, [bookId, currentPage]);

  useEffect(() => {
    refreshAnnotations();
  }, [refreshAnnotations]);

  // Load book metadata including chapter completion state, read pages, and auto-mark settings
  useEffect(() => {
    getBook(bookId).then((b) => {
      if (b) {
        if (b.completedChapters) setCompletedChapters(b.completedChapters);
        if (b.readPages) setReadPages(b.readPages);
        if (b.disabledAutoMarkChapters) setDisabledAutoMarkChapters(b.disabledAutoMarkChapters);
        if (b.studyTimeSeconds !== undefined) setStudyTimeSeconds(b.studyTimeSeconds);
        if (b.quizScores) setQuizScores(b.quizScores);
        if (b.isCompleted !== undefined) setIsCompleted(b.isCompleted);
      }
    });
  }, [bookId]);

  // Record page visit and execute auto-mark completion for finished chapters/subchapters
  useEffect(() => {
    if (totalPages > 0 && currentPage > 0) {
      recordPageVisit(bookId, currentPage, totalPages, toc).then((res) => {
        setReadPages(res.readPages);
        setCompletedChapters(res.completedChapters);
      });
    }
  }, [bookId, currentPage, totalPages, toc]);

  const handleToggleChapter = async (chapterId: string) => {
    const updated = await toggleChapterCompleted(bookId, chapterId);
    setCompletedChapters(updated);
  };

  const handleToggleAutoMark = async (chapterId: string) => {
    const updated = await toggleAutoMarkChapter(bookId, chapterId);
    setDisabledAutoMarkChapters(updated);
  };

  const handleResetChapter = async (chapterItem: TocItem) => {
    const res = await resetChapterProgress(bookId, chapterItem);
    setReadPages(res.readPages);
    setCompletedChapters(res.completedChapters);
  };

  const handleToggleCompleted = async () => {
    const next = !isCompleted;
    setIsCompleted(next);
    const book = await getBook(bookId);
    if (book) {
      await saveBook({ ...book, isCompleted: next });
    }
  };

  const handleOpenQuiz = (chapterToQuiz?: TocItem | null) => {
    if (chapterToQuiz) {
      setQuizModalState({ isOpen: true, chapter: chapterToQuiz });
      return;
    }
    const activeInfo = findActiveChapter(toc, currentPage);
    const target =
      activeInfo.subchapter ||
      activeInfo.chapter ||
      (toc.length > 0
        ? toc[0]
        : {
            id: `current_section_${currentPage}`,
            title: `Pages ${currentPage} - ${Math.min(totalPages, currentPage + 5)}`,
            pageNumber: currentPage,
            endPage: Math.min(totalPages, currentPage + 5),
          });
    setQuizModalState({ isOpen: true, chapter: target });
  };

  const handleSaveQuizScore = async (chapterId: string, score: number, total: number) => {
    const updated = await saveChapterQuizScore(bookId, chapterId, score, total);
    setQuizScores(updated);
  };

  // Render Page to Canvas + Text Layer
  useEffect(() => {
    if (!pdfDoc) return;
    let isRenderCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isRenderCancelled) return;

        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        // Set dimensions
        setPageSize({ width: viewport.width, height: viewport.height });

        // Setup PDF Canvas with devicePixelRatio for ultra-sharp text
        const canvas = pageCanvasRef.current;
        if (canvas) {
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            await page.render({
              canvasContext: ctx,
              canvas,
              viewport,
            } as any).promise;
          }
        }

        // Render PDF text layer for native text selection
        const textLayer = textLayerRef.current;
        if (textLayer && !isRenderCancelled) {
          textLayer.innerHTML = '';
          textLayer.style.width = `${Math.floor(viewport.width)}px`;
          textLayer.style.height = `${Math.floor(viewport.height)}px`;

          const textContent = await page.getTextContent();
          if (isRenderCancelled) return;

          for (const item of textContent.items as any[]) {
            if (!item.str) continue;
            const tx = pdfjsLibTransform(viewport, item.transform);
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.left = `${tx.x}px`;
            span.style.top = `${tx.y}px`;
            span.style.fontSize = `${tx.fontSize}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            textLayer.appendChild(span);
          }
        }
      } catch (err) {
        if (!isRenderCancelled) {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isRenderCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  // Helper to transform text positions for text layer
  const pdfjsLibTransform = (viewport: any, transform: number[]) => {
    const scaleFactor = viewport.scale;
    const x = transform[4] * scaleFactor;
    const y = viewport.height - transform[5] * scaleFactor - (transform[0] * scaleFactor);
    const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) * scaleFactor;
    return { x, y, fontSize };
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(3.0, s + 0.15));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.6, s - 0.15));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Handle Text Selection Popup
  const handleMouseUp = () => {
    if (isDrawingActive) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionTooltip(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectionTooltip(null);
      return;
    }

    const container = pageContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const range = selection.getRangeAt(0);
    const rawRects = Array.from(range.getClientRects());
    const validRects = rawRects.filter((r) => r.width > 1 && r.height > 1);

    if (validRects.length === 0) {
      setSelectionTooltip(null);
      return;
    }

    // Normalize rects [0..1] relative to the PDF page container
    const normalizedRects: HighlightRect[] = validRects.map((r) => ({
      x: Math.max(0, (r.left - containerRect.left) / containerRect.width),
      y: Math.max(0, (r.top - containerRect.top) / containerRect.height),
      width: Math.min(1, r.width / containerRect.width),
      height: Math.min(1, r.height / containerRect.height),
    }));

    const firstRect = validRects[0];
    setSelectionTooltip({
      x: firstRect.left + firstRect.width / 2,
      y: firstRect.top,
      text,
      rects: normalizedRects,
    });
  };

  // Apply Highlight
  const handleApplyHighlight = async (color: string, note?: string) => {
    if (!selectionTooltip) return;
    const newHl: HighlightItem = {
      id: `hl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      pageNumber: currentPage,
      text: selectionTooltip.text,
      color,
      note,
      rects: selectionTooltip.rects,
      createdAt: Date.now(),
    };

    await addHighlight(newHl);
    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
    refreshAnnotations();
  };

  // Helper to get or recover rects for any highlight
  const getHighlightRects = (hl: HighlightItem): HighlightRect[] => {
    if (hl.rects && hl.rects.length > 0) {
      return hl.rects;
    }
    const textLayer = textLayerRef.current;
    const container = pageContainerRef.current;
    if (!textLayer || !container || !hl.text) return [];

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return [];

    const spans = Array.from(textLayer.querySelectorAll('span'));
    const target = hl.text.trim().toLowerCase();
    const found: HighlightRect[] = [];

    for (const span of spans) {
      const spanText = (span.textContent || '').trim().toLowerCase();
      if (!spanText) continue;
      if (target.includes(spanText) || spanText.includes(target)) {
        const r = span.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) {
          found.push({
            x: Math.max(0, (r.left - containerRect.left) / containerRect.width),
            y: Math.max(0, (r.top - containerRect.top) / containerRect.height),
            width: Math.min(1, r.width / containerRect.width),
            height: Math.min(1, r.height / containerRect.height),
          });
        }
      }
    }
    return found;
  };

  // Jump to specific highlight handler (pulses highlight and scrolls to view)
  const handleJumpToHighlight = (pageNumber: number, highlightId: string) => {
    setCurrentPage(pageNumber);
    setPulsingHighlightId(highlightId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    setTimeout(() => {
      setPulsingHighlightId((curr) => (curr === highlightId ? null : curr));
    }, 1200);
  };

  // If initialHighlightId changes (e.g. from search)
  useEffect(() => {
    if (initialHighlightId) {
      setPulsingHighlightId(initialHighlightId);
      const timer = setTimeout(() => {
        setPulsingHighlightId((curr) => (curr === initialHighlightId ? null : curr));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [initialHighlightId]);

  // Scroll pulsing highlight into view smoothly
  useEffect(() => {
    if (!pulsingHighlightId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector('.highlight-pulse');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pulsingHighlightId, currentPage]);

  // Update attached note on a highlight
  const handleUpdateHighlightNote = async (highlightId: string, newNote: string) => {
    const hl = highlights.find((h) => h.id === highlightId);
    if (hl) {
      const updated: HighlightItem = {
        ...hl,
        note: newNote || undefined,
      };
      await addHighlight(updated);
      if (activePopoverHighlight?.highlight.id === highlightId) {
        setActivePopoverHighlight({
          ...activePopoverHighlight,
          highlight: updated,
        });
      }
      refreshAnnotations();
    }
  };

  // Bookmark toggling
  const handleBookmarkToggle = async () => {
    const newState = await toggleBookmark(bookId, currentPage);
    setIsCurrentBookmarked(newState);
    refreshAnnotations();
  };

  // Margin Note saving
  const handleSaveMarginNote = async () => {
    if (!newNoteText.trim()) return;
    const note: NoteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookId,
      pageNumber: currentPage,
      content: newNoteText.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveNote(note);
    setNewNoteText('');
    setIsAddNoteModalOpen(false);
    refreshAnnotations();
  };

  // Clear current page drawings
  const handleClearPageDrawings = async () => {
    if (confirm('Clear all drawings on this page?')) {
      await savePageDrawings(bookId, currentPage, []);
      refreshAnnotations();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-purple-50/40">
        <div className="p-6 bg-white rounded-3xl shadow-xl shadow-purple-500/10 border border-purple-100 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-700">Loading textbook...</p>
          <span className="text-xs text-purple-400">Preparing pages and drawing layers</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md p-6 bg-white rounded-3xl shadow-xl border border-rose-200 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Error Loading Textbook</h2>
          <p className="text-xs text-gray-600">{errorMessage}</p>
          <button
            onClick={onBackToLibrary}
            className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 transition-all"
          >
            Return to Bookshelf
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-[#F5F3FB]">
      {/* Top Navbar */}
      <ReaderNavbar
        bookId={bookId}
        title={bookTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        onPageChange={(p) => setCurrentPage(p)}
        onZoomIn={() => setScale((s) => Math.min(3.0, s + 0.2))}
        onZoomOut={() => setScale((s) => Math.max(0.6, s - 0.2))}
        onResetZoom={() => setScale(1.2)}
        onBackToLibrary={onBackToLibrary}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        isBookmarked={isCurrentBookmarked}
        onToggleBookmark={handleBookmarkToggle}
        onOpenAddNote={() => setIsAddNoteModalOpen(true)}
        notesCount={highlights.length + notes.length}
        initialStudyTimeSeconds={studyTimeSeconds}
        onStudyTimeUpdate={setStudyTimeSeconds}
        onOpenQuiz={() => handleOpenQuiz()}
      />

      {/* Main Document Reading Area */}
      <main
        ref={containerRef}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        className="flex-1 overflow-auto flex justify-center items-start p-4 sm:p-8 select-text"
      >
        <div
          ref={pageContainerRef}
          className="relative bg-white shadow-2xl shadow-purple-900/10 rounded-sm overflow-hidden transition-shadow select-text"
          style={{
            width: pageSize.width ? `${pageSize.width}px` : 'auto',
            height: pageSize.height ? `${pageSize.height}px` : 'auto',
            isolation: 'isolate',
          }}
        >
          {/* PDF Page Canvas */}
          <canvas ref={pageCanvasRef} className="block pointer-events-none" />

          {/* Text Layer for Selection & Native Text Highlighting */}
          <div ref={textLayerRef} className="textLayer z-10" />

          {/* Visual Text Highlights Layer (z-20 above text layer so clicking works reliably) */}
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {highlights
              .filter((hl) => hl.pageNumber === currentPage)
              .map((hl) => {
                const rects = getHighlightRects(hl);
                const isPulsing = hl.id === pulsingHighlightId;
                return (
                  <div key={hl.id} className="contents">
                    {rects.map((rect, rIdx) => (
                      <div
                        key={`${hl.id}_${rIdx}`}
                        className={`absolute pointer-events-auto cursor-pointer rounded-none transition-all ${
                          isPulsing ? 'highlight-pulse' : 'hover:opacity-85'
                        }`}
                        style={{
                          left: `${rect.x * pageSize.width}px`,
                          top: `${rect.y * pageSize.height}px`,
                          width: `${rect.width * pageSize.width}px`,
                          height: `${rect.height * pageSize.height}px`,
                          backgroundColor: hl.color,
                          mixBlendMode: 'multiply',
                          opacity: 0.45,
                        }}
                        title={
                          hl.note
                            ? `Note: ${hl.note} (Click to view)`
                            : `Highlight: "${hl.text}" (Click to view note)`
                        }
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const clientRect = e.currentTarget.getBoundingClientRect();
                          setActivePopoverHighlight({
                            highlight: hl,
                            x: clientRect.left + clientRect.width / 2,
                            y: clientRect.top,
                          });
                          setPulsingHighlightId(hl.id);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
          </div>

          {/* Transparent Stylus / Touch Annotation Overlay */}
          {pageSize.width > 0 && pageSize.height > 0 && (
            <DrawingCanvas
              bookId={bookId}
              pageNumber={currentPage}
              width={pageSize.width}
              height={pageSize.height}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              isDrawingActive={isDrawingActive}
            />
          )}
        </div>
      </main>

      {/* Floating Drawing Toolbar */}
      <DrawingToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        isDrawingActive={isDrawingActive}
        setIsDrawingActive={setIsDrawingActive}
        onClearPage={handleClearPageDrawings}
      />

      {/* Text Highlight Floating Popover Tooltip */}
      {selectionTooltip && (
        <TextHighlightTooltip
          position={{ x: selectionTooltip.x, y: selectionTooltip.y }}
          selectedText={selectionTooltip.text}
          onHighlight={handleApplyHighlight}
          onClose={() => setSelectionTooltip(null)}
        />
      )}

      {/* Clicked Highlight Note Popover */}
      {activePopoverHighlight && (
        <HighlightNotePopover
          highlight={activePopoverHighlight.highlight}
          position={{ x: activePopoverHighlight.x, y: activePopoverHighlight.y }}
          onClose={() => setActivePopoverHighlight(null)}
          onUpdateNote={handleUpdateHighlightNote}
          onDeleteHighlight={async (id) => {
            await deleteHighlight(id);
            setActivePopoverHighlight(null);
            refreshAnnotations();
          }}
          onOpenInSidebar={() => {
            setIsSidebarOpen(true);
            setActivePopoverHighlight(null);
          }}
        />
      )}

      {/* Collapsible Sidebar */}
      <ReaderSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpToPage={(p) => {
          setCurrentPage(p);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        onJumpToHighlight={handleJumpToHighlight}
        toc={toc}
        highlights={highlights}
        notes={notes}
        bookmarks={bookmarks}
        onDeleteHighlight={async (id) => {
          await deleteHighlight(id);
          refreshAnnotations();
        }}
        onDeleteNote={async (id) => {
          await deleteNote(id);
          refreshAnnotations();
        }}
        onDeleteBookmark={async (id) => {
          await deleteBookmark(id);
          refreshAnnotations();
        }}
        bookTitle={bookTitle}
        isCompleted={isCompleted}
        onToggleCompleted={handleToggleCompleted}
        completedChapterIds={completedChapters}
        onToggleChapter={handleToggleChapter}
        readPages={readPages}
        disabledAutoMarkIds={disabledAutoMarkChapters}
        onResetChapter={handleResetChapter}
        onToggleAutoMark={handleToggleAutoMark}
        studyTimeSeconds={studyTimeSeconds}
        onOpenQuiz={handleOpenQuiz}
        quizScores={quizScores}
      />

      {/* Add Margin Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 space-y-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-sm">Add Note to Page {currentPage}</h3>
            </div>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write your thoughts, key concepts, or revision notes here..."
              rows={4}
              autoFocus
              className="w-full text-xs p-3 bg-purple-50/50 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setNewNoteText('');
                  setIsAddNoteModalOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMarginNote}
                className="px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-sm"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Pop Quiz Modal */}
      <QuizModal
        isOpen={quizModalState.isOpen}
        onClose={() => setQuizModalState({ isOpen: false, chapter: null })}
        pdfDoc={pdfDoc}
        chapter={quizModalState.chapter}
        bookId={bookId}
        onSaveScore={handleSaveQuizScore}
      />
    </div>
  );
};
