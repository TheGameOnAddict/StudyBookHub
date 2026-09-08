import type { TocItem } from '../types';

export interface ChapterProgressInfo {
  progress: number; // 0 to 100
  pagesRead: number;
  totalPages: number;
  startPage: number;
  endPage: number;
  isFullyRead: boolean;
  isAutoMarkDisabled?: boolean;
}

/**
 * Finds the currently active chapter and subchapter based on currentPage
 */
export function findActiveChapter(
  toc: TocItem[],
  currentPage: number
): { chapter: TocItem | null; subchapter: TocItem | null } {
  let activeChapter: TocItem | null = null;
  let activeSubchapter: TocItem | null = null;

  for (const item of toc) {
    const start = item.pageNumber;
    const end = item.endPage || start;

    if (currentPage >= start && currentPage <= end) {
      activeChapter = item;

      // Check if inside a sub-chapter
      if (item.items && item.items.length > 0) {
        for (const sub of item.items) {
          const subStart = sub.pageNumber;
          const subEnd = sub.endPage || subStart;
          if (currentPage >= subStart && currentPage <= subEnd) {
            activeSubchapter = sub;
            break;
          }
        }
      }
      break;
    }
  }

  return { chapter: activeChapter, subchapter: activeSubchapter };
}

/**
 * Calculates page progress for a specific chapter or subchapter based on distinct read pages
 */
export function getChapterPageProgress(
  item: TocItem,
  readPages: number[] = [],
  disabledAutoMarkIds: string[] = []
): ChapterProgressInfo {
  const start = item.pageNumber;
  const end = item.endPage || start;
  const total = Math.max(1, end - start + 1);

  const readSet = new Set(readPages);
  let pagesRead = 0;
  for (let p = start; p <= end; p++) {
    if (readSet.has(p)) {
      pagesRead++;
    }
  }

  const progress = Math.min(100, Math.round((pagesRead / total) * 100));
  const isFullyRead = pagesRead === total;
  const isAutoMarkDisabled = !!(item.id && disabledAutoMarkIds.includes(item.id));

  return {
    progress,
    pagesRead,
    totalPages: total,
    startPage: start,
    endPage: end,
    isFullyRead,
    isAutoMarkDisabled,
  };
}

/**
 * Counts total chapters and how many have been marked completed
 */
export function countTotalChaptersAndCompleted(
  toc: TocItem[],
  completedIds: string[]
): { total: number; completed: number; percent: number } {
  const completedSet = new Set(completedIds);
  let total = 0;
  let completed = 0;

  const traverse = (items: TocItem[]) => {
    for (const it of items) {
      total++;
      if (it.id && completedSet.has(it.id)) {
        completed++;
      }
      if (it.items && it.items.length > 0) {
        traverse(it.items);
      }
    }
  };

  traverse(toc);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percent };
}
