export interface Book {
  id: string;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  progress: number; // 0 to 100
  fileSize: number;
  addedAt: number;
  lastReadAt: number;
  isCompleted?: boolean;
  completedChapters?: string[]; // IDs of studied chapters/subchapters
  readPages?: number[]; // Distinct page numbers completed/visited
  disabledAutoMarkChapters?: string[]; // Chapter/subchapter IDs with auto-mark disabled
  studyTimeSeconds?: number; // Total study time spent in seconds
  quizScores?: Record<string, ChapterQuizScore>; // Map chapterId -> last quiz score
  coverDataUrl?: string;
  pdfBlob?: Blob; // Stored locally in IndexedDB for instant offline opening
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  isHighlighter?: boolean;
}

export interface PageDrawings {
  id?: number;
  bookId: string;
  pageNumber: number;
  strokes: DrawingStroke[];
  updatedAt: number;
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HighlightItem {
  id: string;
  bookId: string;
  pageNumber: number;
  text: string;
  color: string; // hex or color name
  note?: string;
  rects?: HighlightRect[];
  createdAt: number;
}

export interface NoteItem {
  id: string;
  bookId: string;
  pageNumber: number;
  content: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkItem {
  id: string;
  bookId: string;
  pageNumber: number;
  label: string;
  createdAt: number;
}

export interface TocItem {
  id?: string;
  title: string;
  pageNumber: number;
  endPage?: number;
  items?: TocItem[];
}

export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

export interface AppSyncData {
  version: number;
  exportedAt: number;
  booksMeta: Omit<Book, 'pdfBlob'>[];
  drawings: PageDrawings[];
  highlights: HighlightItem[];
  notes: NoteItem[];
  bookmarks: BookmarkItem[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0 to 3
  explanation: string;
  relevantPage?: number;
}

export interface ChapterQuizScore {
  score: number;
  total: number;
  timestamp: number;
}

