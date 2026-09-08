import * as pdfjsLib from 'pdfjs-dist';
import type { TocItem } from '../types';

// Set up PDF.js worker using Vite asset URL with fallback to cdnjs
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export { pdfjsLib };

export interface RenderedPageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Loads a PDF document from an ArrayBuffer or Blob
 */
export async function loadPdfDocument(source: ArrayBuffer | Blob): Promise<pdfjsLib.PDFDocumentProxy> {
  const data = source instanceof Blob ? await source.arrayBuffer() : source;
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });
  return await loadingTask.promise;
}

/**
 * Extracts Table of Contents (Outline) from PDF if available
 */
export async function extractPdfOutline(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<TocItem[]> {
  try {
    const outline = await pdfDoc.getOutline();
    if (!outline || outline.length === 0) return [];

    const resolveDest = async (destInput: any): Promise<number | null> => {
      try {
        let dest = destInput;
        if (typeof dest === 'string') {
          dest = await pdfDoc.getDestination(dest);
        }
        if (Array.isArray(dest) && dest.length > 0) {
          const first = dest[0];
          if (typeof first === 'number') {
            return first + 1;
          }
          if (first && typeof first === 'object') {
            const pageIdx = await pdfDoc.getPageIndex(first);
            return pageIdx + 1;
          }
        }
      } catch (err) {
        console.warn('Could not resolve TOC destination:', destInput, err);
      }
      return null;
    };

    const parseItems = async (items: any[]): Promise<TocItem[]> => {
      const results: TocItem[] = [];
      for (const item of items) {
        let pageNum: number | null = null;
        if (item.dest) {
          pageNum = await resolveDest(item.dest);
        }

        const subItems = item.items && item.items.length > 0 ? await parseItems(item.items) : undefined;
        const finalPage = pageNum || subItems?.[0]?.pageNumber || 1;

        results.push({
          title: item.title ? item.title.trim() : 'Untitled Section',
          pageNumber: finalPage,
          items: subItems,
        });
      }
      return results;
    };

    const rawItems = await parseItems(outline);
    return enrichTocItemsWithPageRanges(rawItems, pdfDoc.numPages);
  } catch (err) {
    console.warn('Error reading PDF outline:', err);
    return [];
  }
}

export function enrichTocItemsWithPageRanges(
  items: TocItem[],
  totalPages: number,
  parentEndPage?: number,
  prefix = 'toc'
): TocItem[] {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const safeTitle = item.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    item.id = `${prefix}_${item.pageNumber}_${i}_${safeTitle}`;

    // Determine endPage:
    // If there is a next sibling, it ends before the next sibling starts
    // If it's the last sibling, it ends at parentEndPage (or totalPages for top-level)
    let end: number;
    if (i < items.length - 1) {
      const nextSiblingStart = items[i + 1].pageNumber;
      end = nextSiblingStart > item.pageNumber ? nextSiblingStart - 1 : item.pageNumber;
    } else {
      end = parentEndPage ?? totalPages;
    }
    item.endPage = Math.max(item.pageNumber, end);

    // If item has children, recursively assign end pages bounded by this item's endPage
    if (item.items && item.items.length > 0) {
      enrichTocItemsWithPageRanges(item.items, totalPages, item.endPage, `${item.id}`);
    }
  }

  return items;
}

/**
 * Generates a thumbnail image DataURL from page 1 of the PDF
 */
export async function generatePdfThumbnail(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<string> {
  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    await page.render({
      canvasContext: ctx,
      canvas,
      viewport,
    } as any).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.warn('Could not generate cover thumbnail:', e);
    return '';
  }
}
