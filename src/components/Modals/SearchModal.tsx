import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, Highlighter, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../../services/db';
import type { Book } from '../../types';

interface SearchResult {
  type: 'book' | 'highlight' | 'note';
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  snippet: string;
  subText?: string;
  color?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (bookId: string, pageNumber: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const performSearch = async () => {
      try {
        const q = query.toLowerCase();
        const [books, highlights, notes] = await Promise.all([
          db.books.toArray(),
          db.highlights.toArray(),
          db.notes.toArray(),
        ]);

        const bookMap = new Map<string, Book>();
        books.forEach((b) => bookMap.set(b.id, b));

        const matches: SearchResult[] = [];

        // Search Books
        books.forEach((b) => {
          if (b.title.toLowerCase().includes(q)) {
            matches.push({
              type: 'book',
              bookId: b.id,
              bookTitle: b.title,
              pageNumber: b.currentPage || 1,
              snippet: b.title,
              subText: `Currently on page ${b.currentPage} of ${b.totalPages}`,
            });
          }
        });

        // Search Highlights
        highlights.forEach((hl) => {
          if (
            hl.text.toLowerCase().includes(q) ||
            (hl.note && hl.note.toLowerCase().includes(q))
          ) {
            const b = bookMap.get(hl.bookId);
            matches.push({
              type: 'highlight',
              bookId: hl.bookId,
              bookTitle: b?.title || 'Unknown Textbook',
              pageNumber: hl.pageNumber,
              snippet: hl.text,
              subText: hl.note ? `Note: ${hl.note}` : undefined,
              color: hl.color,
            });
          }
        });

        // Search Notes
        notes.forEach((nt) => {
          if (nt.content.toLowerCase().includes(q)) {
            const b = bookMap.get(nt.bookId);
            matches.push({
              type: 'note',
              bookId: nt.bookId,
              bookTitle: b?.title || 'Unknown Textbook',
              pageNumber: nt.pageNumber,
              snippet: nt.content,
              color: nt.color,
            });
          }
        });

        if (isMounted) {
          setResults(matches);
          setIsSearching(false);
        }
      } catch (err) {
        console.error('Search error:', err);
        if (isMounted) setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-purple-100 flex items-center gap-3 bg-purple-50/30">
          <Search className="w-5 h-5 text-purple-600 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search textbooks, notes, or highlights..."
            autoFocus
            className="flex-1 text-sm bg-transparent placeholder-gray-400 text-gray-900 focus:outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2 py-1 text-gray-500 hover:text-gray-700 bg-white border border-purple-100 rounded-lg"
          >
            Esc
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 text-purple-200" />
              Type a keyword to search across all your local textbooks, highlights, and notes.
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No results found for "{query}".
            </div>
          ) : (
            results.map((res, index) => (
              <div
                key={index}
                onClick={() => {
                  onSelectResult(res.bookId, res.pageNumber);
                  onClose();
                }}
                className="p-3 rounded-2xl border border-purple-100/70 hover:bg-purple-50/50 hover:border-purple-200 cursor-pointer transition-all flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-purple-100/70 text-purple-700 shrink-0 mt-0.5">
                    {res.type === 'book' && <BookOpen className="w-4 h-4" />}
                    {res.type === 'highlight' && <Highlighter className="w-4 h-4" />}
                    {res.type === 'note' && <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {res.bookTitle}
                      </span>
                      <span className="text-[10px] font-mono text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-md shrink-0">
                        Page {res.pageNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 italic">
                      "{res.snippet}"
                    </p>
                    {res.subText && (
                      <p className="text-[11px] text-purple-700 font-medium">
                        {res.subText}
                      </p>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-purple-600">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
