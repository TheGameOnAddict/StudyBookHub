import Dexie, { type Table } from 'dexie';
import type {
  AppSyncData,
  Book,
  BookmarkItem,
  DrawingStroke,
  HighlightItem,
  NoteItem,
  PageDrawings,
  TocItem,
} from '../types';

export class StudyBookHubDatabase extends Dexie {
  books!: Table<Book, string>;
  drawings!: Table<PageDrawings, number>;
  highlights!: Table<HighlightItem, string>;
  notes!: Table<NoteItem, string>;
  bookmarks!: Table<BookmarkItem, string>;

  constructor() {
    super('StudyBookHubDB');
    this.version(1).stores({
      books: 'id, title, lastReadAt, progress, isCompleted',
      drawings: '++id, [bookId+pageNumber], bookId, pageNumber',
      highlights: 'id, bookId, pageNumber, createdAt',
      notes: 'id, bookId, pageNumber, createdAt',
      bookmarks: 'id, bookId, pageNumber, createdAt',
    });
  }
}

export const db = new StudyBookHubDatabase();

// --- Books Operations ---
export async function getAllBooks(): Promise<Book[]> {
  return await db.books.orderBy('lastReadAt').reverse().toArray();
}

export async function getBook(id: string): Promise<Book | undefined> {
  return await db.books.get(id);
}

export async function saveBook(book: Book): Promise<void> {
  await db.books.put(book);
}

export async function updateBookProgress(
  bookId: string,
  currentPage: number,
  totalPages: number
): Promise<void> {
  const progress = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
  const isCompleted = currentPage >= totalPages;
  await db.books.update(bookId, {
    currentPage,
    progress,
    lastReadAt: Date.now(),
    isCompleted,
  });
}

export async function toggleChapterCompleted(bookId: string, chapterId: string): Promise<string[]> {
  const book = await db.books.get(bookId);
  if (!book) return [];
  const currentCompleted = new Set(book.completedChapters || []);
  if (currentCompleted.has(chapterId)) {
    currentCompleted.delete(chapterId);
  } else {
    currentCompleted.add(chapterId);
  }
  const updated = Array.from(currentCompleted);
  await db.books.update(bookId, { completedChapters: updated });
  return updated;
}

export async function recordPageVisit(
  bookId: string,
  currentPage: number,
  totalPages: number,
  toc: TocItem[]
): Promise<{ readPages: number[]; completedChapters: string[]; progress: number }> {
  const book = await db.books.get(bookId);
  if (!book) return { readPages: [currentPage], completedChapters: [], progress: 0 };

  const readPagesSet = new Set(book.readPages || []);
  readPagesSet.add(currentPage);
  const updatedReadPages = Array.from(readPagesSet).sort((a, b) => a - b);

  // Overall book progress based on count of unique pages read out of totalPages
  const progress = totalPages > 0 ? Math.min(100, Math.round((updatedReadPages.length / totalPages) * 100)) : 0;
  const isCompleted = progress >= 100;

  // Auto-mark check for chapters & subchapters
  const completedSet = new Set(book.completedChapters || []);
  const disabledAutoMarkSet = new Set(book.disabledAutoMarkChapters || []);

  const checkAutoMark = (items: TocItem[]) => {
    for (const item of items) {
      if (item.id && !disabledAutoMarkSet.has(item.id)) {
        const start = item.pageNumber;
        const end = item.endPage || start;
        let allRead = true;
        for (let p = start; p <= end; p++) {
          if (!readPagesSet.has(p)) {
            allRead = false;
            break;
          }
        }
        if (allRead) {
          completedSet.add(item.id);
        }
      }
      if (item.items && item.items.length > 0) {
        checkAutoMark(item.items);
      }
    }
  };

  if (toc && toc.length > 0) {
    checkAutoMark(toc);
  }

  const updatedCompletedChapters = Array.from(completedSet);

  await db.books.update(bookId, {
    currentPage,
    readPages: updatedReadPages,
    completedChapters: updatedCompletedChapters,
    progress,
    lastReadAt: Date.now(),
    isCompleted,
  });

  return {
    readPages: updatedReadPages,
    completedChapters: updatedCompletedChapters,
    progress,
  };
}

export async function resetChapterProgress(
  bookId: string,
  chapter: TocItem
): Promise<{ readPages: number[]; completedChapters: string[]; progress: number }> {
  const book = await db.books.get(bookId);
  if (!book) return { readPages: [], completedChapters: [], progress: 0 };

  const start = chapter.pageNumber;
  const end = chapter.endPage || start;

  // Collect all chapter IDs to uncomplete (this item + any child subchapters)
  const idsToRemove = new Set<string>();
  const collectIds = (item: TocItem) => {
    if (item.id) idsToRemove.add(item.id);
    if (item.items) item.items.forEach(collectIds);
  };
  collectIds(chapter);

  // Remove pages within this section from readPages
  const updatedReadPages = (book.readPages || []).filter((p) => p < start || p > end);

  // Remove chapter and subchapters from completedChapters
  const updatedCompleted = (book.completedChapters || []).filter((id) => !idsToRemove.has(id));

  // Recalculate overall book progress
  const progress = book.totalPages > 0
    ? Math.min(100, Math.round((updatedReadPages.length / book.totalPages) * 100))
    : 0;

  await db.books.update(bookId, {
    readPages: updatedReadPages,
    completedChapters: updatedCompleted,
    progress,
    isCompleted: progress >= 100,
  });

  return {
    readPages: updatedReadPages,
    completedChapters: updatedCompleted,
    progress,
  };
}

export async function toggleAutoMarkChapter(bookId: string, chapterId: string): Promise<string[]> {
  const book = await db.books.get(bookId);
  if (!book) return [];
  const currentDisabled = new Set(book.disabledAutoMarkChapters || []);
  if (currentDisabled.has(chapterId)) {
    currentDisabled.delete(chapterId); // enable auto-mark
  } else {
    currentDisabled.add(chapterId); // disable auto-mark
  }
  const updated = Array.from(currentDisabled);
  await db.books.update(bookId, { disabledAutoMarkChapters: updated });
  return updated;
}

export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', [db.books, db.drawings, db.highlights, db.notes, db.bookmarks], async () => {
    await db.books.delete(id);
    await db.drawings.where('bookId').equals(id).delete();
    await db.highlights.where('bookId').equals(id).delete();
    await db.notes.where('bookId').equals(id).delete();
    await db.bookmarks.where('bookId').equals(id).delete();
  });
}

// --- Drawings Operations ---
export async function getPageDrawings(bookId: string, pageNumber: number): Promise<DrawingStroke[]> {
  const record = await db.drawings.where({ bookId, pageNumber }).first();
  return record?.strokes || [];
}

export async function savePageDrawings(
  bookId: string,
  pageNumber: number,
  strokes: DrawingStroke[]
): Promise<void> {
  const existing = await db.drawings.where({ bookId, pageNumber }).first();
  if (existing && existing.id) {
    await db.drawings.update(existing.id, {
      strokes,
      updatedAt: Date.now(),
    });
  } else {
    await db.drawings.add({
      bookId,
      pageNumber,
      strokes,
      updatedAt: Date.now(),
    });
  }
}

export async function getAllDrawingsForBook(bookId: string): Promise<PageDrawings[]> {
  return await db.drawings.where('bookId').equals(bookId).toArray();
}

// --- Highlights Operations ---
export async function getBookHighlights(bookId: string): Promise<HighlightItem[]> {
  return await db.highlights.where('bookId').equals(bookId).sortBy('pageNumber');
}

export async function addHighlight(highlight: HighlightItem): Promise<void> {
  await db.highlights.put(highlight);
}

export async function deleteHighlight(id: string): Promise<void> {
  await db.highlights.delete(id);
}

// --- Notes Operations ---
export async function getBookNotes(bookId: string): Promise<NoteItem[]> {
  return await db.notes.where('bookId').equals(bookId).sortBy('pageNumber');
}

export async function getAllNotes(): Promise<NoteItem[]> {
  return await db.notes.toArray();
}

export async function saveNote(note: NoteItem): Promise<void> {
  await db.notes.put(note);
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

// --- Bookmarks Operations ---
export async function getBookmarks(bookId: string): Promise<BookmarkItem[]> {
  return await db.bookmarks.where('bookId').equals(bookId).sortBy('pageNumber');
}

export async function deleteBookmark(id: string): Promise<void> {
  await db.bookmarks.delete(id);
}

export async function toggleBookmark(bookId: string, pageNumber: number, label?: string): Promise<boolean> {
  const existing = await db.bookmarks.where({ bookId, pageNumber }).first();
  if (existing) {
    await db.bookmarks.delete(existing.id);
    return false;
  } else {
    await db.bookmarks.add({
      id: `${bookId}_page_${pageNumber}`,
      bookId,
      pageNumber,
      label: label || `Page ${pageNumber}`,
      createdAt: Date.now(),
    });
    return true;
  }
}

export async function isBookmarked(bookId: string, pageNumber: number): Promise<boolean> {
  const count = await db.bookmarks.where({ bookId, pageNumber }).count();
  return count > 0;
}

// --- Full Sync Export / Import (Lightweight JSON, leaves large PDFs on disk/device) ---
export async function exportStudyData(): Promise<AppSyncData> {
  const books = await db.books.toArray();
  const drawings = await db.drawings.toArray();
  const highlights = await db.highlights.toArray();
  const notes = await db.notes.toArray();
  const bookmarks = await db.bookmarks.toArray();

  // Strip large PDF blob from cloud/export payload for fast, light syncing
  const booksMeta = books.map(({ pdfBlob: _blob, ...meta }) => meta);

  return {
    version: 1,
    exportedAt: Date.now(),
    booksMeta,
    drawings,
    highlights,
    notes,
    bookmarks,
  };
}

export async function importStudyData(data: AppSyncData): Promise<{ booksUpdated: number; notesUpdated: number }> {
  if (!data || data.version !== 1) {
    throw new Error('Invalid or incompatible study backup data.');
  }

  await db.transaction('rw', [db.books, db.drawings, db.highlights, db.notes, db.bookmarks], async () => {
    // Merge books meta (preserve existing pdfBlob if present)
    for (const bookMeta of data.booksMeta) {
      const existing = await db.books.get(bookMeta.id);
      await db.books.put({
        ...bookMeta,
        pdfBlob: existing?.pdfBlob, // retain locally cached PDF
      });
    }

    // Replace or merge drawings
    for (const drawing of data.drawings) {
      const existing = await db.drawings.where({ bookId: drawing.bookId, pageNumber: drawing.pageNumber }).first();
      if (existing?.id) {
        await db.drawings.update(existing.id, {
          strokes: drawing.strokes,
          updatedAt: drawing.updatedAt,
        });
      } else {
        await db.drawings.add({
          bookId: drawing.bookId,
          pageNumber: drawing.pageNumber,
          strokes: drawing.strokes,
          updatedAt: drawing.updatedAt,
        });
      }
    }

    // Merge highlights
    for (const hl of data.highlights) {
      await db.highlights.put(hl);
    }

    // Merge notes
    for (const note of data.notes) {
      await db.notes.put(note);
    }

    // Merge bookmarks
    for (const bm of data.bookmarks) {
      await db.bookmarks.put(bm);
    }
  });

  return {
    booksUpdated: data.booksMeta.length,
    notesUpdated: data.notes.length + data.highlights.length,
  };
}
