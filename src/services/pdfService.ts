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

    const parseItems = async (items: any[]): Promise<TocItem[]> => {
      const results: TocItem[] = [];
      for (const item of items) {
        let pageNum = 1;
        try {
          if (item.dest) {
            let dest = item.dest;
            if (typeof dest === 'string') {
              dest = await pdfDoc.getDestination(dest);
            }
            if (Array.isArray(dest) && dest[0]) {
              const pageIndex = await pdfDoc.getPageIndex(dest[0]);
              pageNum = pageIndex + 1;
            }
          }
        } catch (e) {
          console.warn('Could not resolve TOC destination:', e);
        }

        const subItems = item.items && item.items.length > 0 ? await parseItems(item.items) : undefined;
        results.push({
          title: item.title || 'Untitled Section',
          pageNumber: pageNum,
          items: subItems,
        });
      }
      return results;
    };

    return await parseItems(outline);
  } catch (err) {
    console.warn('Error reading PDF outline:', err);
    return [];
  }
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
