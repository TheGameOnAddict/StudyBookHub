import type { TocItem } from '../types';

export interface ChapterProgressInfo {
  progress: number; // 0 to 100
  pagesRead: number;
  totalPages: number;
  startPage: number;
  endPage: number;
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
 * Calculates page progress for a specific chapter or subchapter
 */
export function getChapterPageProgress(
  item: TocItem,
  currentPage: number
): ChapterProgressInfo {
  const start = item.pageNumber;
  const end = item.endPage || start;
  const total = Math.max(1, end - start + 1);

  let pagesRead = 0;
  if (currentPage >= end) {
    pagesRead = total;
  } else if (currentPage >= start) {
    pagesRead = currentPage - start + 1;
  }

  const progress = Math.min(100, Math.round((pagesRead / total) * 100));

  return {
    progress,
    pagesRead,
    totalPages: total,
    startPage: start,
    endPage: end,
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
