import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Settings,
  Loader2,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { QuizQuestion, TocItem } from '../../types';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  hasGeminiApiKey,
  validateGeminiApiKey,
  generateChapterQuiz,
  removeGeminiApiKey,
} from '../../services/aiQuizService';
import { extractTextFromPageRange } from '../../services/pdfService';
import type * as pdfjsLib from 'pdfjs-dist';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  chapter: TocItem | null;
  bookId?: string;
  onSaveScore?: (chapterId: string, score: number, total: number) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  chapter,
  onSaveScore,
}) => {
  // Navigation & view states: 'key_setup' | 'loading' | 'quiz' | 'results' | 'error'
  const [view, setView] = useState<'key_setup' | 'loading' | 'quiz' | 'results' | 'error'>('loading');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyValidating, setIsKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Quiz state
  const [loadingStep, setLoadingStep] = useState<string>('Preparing quiz...');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Init when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset temporary states
      setQuestions([]);
      setSelectedAnswers({});
      setCurrentQIndex(0);
      setErrorMessage(null);
      return;
    }

    const savedKey = getGeminiApiKey();
    setApiKeyInput(savedKey);

    if (!savedKey) {
      setView('key_setup');
    } else {
      startQuizGeneration(savedKey);
    }
  }, [isOpen, chapter]);

  const startQuizGeneration = async (keyToUse: string) => {
    if (!chapter) {
      setErrorMessage('No chapter selected for quiz.');
      setView('error');
      return;
    }

    if (!pdfDoc) {
      setErrorMessage('Textbook document is not loaded.');
      setView('error');
      return;
    }

    setView('loading');
    setErrorMessage(null);
    setSelectedAnswers({});
    setCurrentQIndex(0);

    try {
      const start = chapter.pageNumber;
      const end = chapter.endPage || chapter.pageNumber;

      setLoadingStep(`Extracting text from pages ${start} to ${end}...`);
      const extractedText = await extractTextFromPageRange(pdfDoc, start, end, 35000);

      if (!extractedText.trim()) {
        throw new Error(
          `Could not extract readable text from pages ${start}-${end}. This section may contain only scanned images or illustrations.`
        );
      }

      setLoadingStep('Consulting Gemini 1.5 Flash to craft questions...');
      const generated = await generateChapterQuiz(keyToUse, chapter.title, extractedText, 3);

      setQuestions(generated);
      setView('quiz');
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate pop quiz. Please verify your API key and try again.');
      setView('error');
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setKeyError('Please enter your Gemini API key.');
      return;
    }

    setIsKeyValidating(true);
    setKeyError(null);

    const check = await validateGeminiApiKey(cleanKey);
    setIsKeyValidating(false);

    if (!check.valid) {
      setKeyError(check.error || 'Invalid API key. Please check the key and try again.');
      return;
    }

    setGeminiApiKey(cleanKey);
    startQuizGeneration(cleanKey);
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optionIndex,
    }));
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const finishQuiz = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    if (chapter?.id && onSaveScore) {
      onSaveScore(chapter.id, correctCount, questions.length);
    }

    const percentage = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
    if (percentage >= 65) {
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.55 },
        });
      } catch (e) {
        // Confetti fallback
      }
    }

    setView('results');
  };

  if (!isOpen) return null;

  // Calculate score for results view
  const correctCount = questions.reduce(
    (acc, q, idx) => (selectedAnswers[idx] === q.correctAnswerIndex ? acc + 1 : acc),
    0
  );
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-purple-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-purple-50/40">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-700 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm truncate">
                  AI Pop Quiz
                </h3>
                {chapter && (
                  <span className="text-[10px] font-semibold font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full shrink-0">
                    p.{chapter.pageNumber}{chapter.endPage && chapter.endPage > chapter.pageNumber ? `-${chapter.endPage}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {chapter?.title || 'Chapter Assessment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasGeminiApiKey() && view !== 'key_setup' && (
              <button
                onClick={() => setView('key_setup')}
                title="Configure Gemini API Key"
                className="p-2 text-gray-400 hover:text-purple-700 hover:bg-purple-100 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col">
          {/* VIEW: Key Setup */}
          {view === 'key_setup' && (
            <form onSubmit={handleSaveApiKey} className="space-y-4 my-auto">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Key className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 text-base">Bring Your Gemini API Key</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Your key is stored strictly inside your browser's local storage and is never uploaded to any intermediary servers.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/70 text-xs text-purple-900 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Need a free API key?</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 underline font-bold"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Google provides free access with 15 requests per minute and no credit card required. Generate a key in 1 click and paste it below!
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (keyError) setKeyError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                  required
                />
              </div>

              {keyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{keyError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 gap-2">
                <div className="flex items-center gap-3">
                  {hasGeminiApiKey() && (
                    <button
                      type="button"
                      onClick={() => {
                        removeGeminiApiKey();
                        setApiKeyInput('');
                        setKeyError('Saved API key was cleared from this device.');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-medium hover:underline"
                    >
                      Clear Key
                    </button>
                  )}
                  {hasGeminiApiKey() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (questions.length > 0) {
                          setView('quiz');
                        } else {
                          startQuizGeneration(getGeminiApiKey());
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isKeyValidating || !apiKeyInput.trim()}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-all ml-auto"
                >
                  {isKeyValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Key...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Generate Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: Loading */}
          {view === 'loading' && (
            <div className="text-center my-auto py-12 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
                <Sparkles className="w-7 h-7 text-purple-600 absolute inset-0 m-auto animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-sm">Generating AI Pop Quiz</h4>
                <p className="text-xs text-purple-700 font-medium animate-pulse">{loadingStep}</p>
              </div>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Reading chapter text and formulating 3 conceptual questions with answers and explanations...
              </p>
            </div>
          )}

          {/* VIEW: Error */}
          {view === 'error' && (
            <div className="text-center my-auto py-8 space-y-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-900 text-sm">Quiz Generation Notice</h4>
                <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                  {errorMessage}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setView('key_setup')}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Check API Key
                </button>
                <button
                  onClick={() => startQuizGeneration(getGeminiApiKey())}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Active Quiz */}
          {view === 'quiz' && questions.length > 0 && (
            <div className="flex flex-col flex-1 justify-between space-y-6">
              {/* Progress and question counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-700 uppercase tracking-wider text-[10px]">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  <span className="text-gray-400 text-[11px]">
                    {Object.keys(selectedAnswers).length} / {questions.length} answered
                  </span>
                </div>
                <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQIndex + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Current Question */}
              <div className="space-y-4 my-auto">
                <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug">
                  {questions[currentQIndex]?.question}
                </h4>

                {/* Options list */}
                <div className="space-y-2.5">
                  {questions[currentQIndex]?.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentQIndex] === optIdx;
                    const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 group ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-xs ring-2 ring-purple-600/20'
                            : 'border-purple-200/80 bg-white hover:border-purple-300 hover:bg-purple-50/30 text-gray-800'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-100 text-purple-700 group-hover:bg-purple-200'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1 pt-0.5">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-purple-100">
                <button
                  onClick={handlePrev}
                  disabled={currentQIndex === 0}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1">
                  {questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === currentQIndex
                          ? 'bg-purple-600 w-5'
                          : selectedAnswers[idx] !== undefined
                          ? 'bg-purple-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={selectedAnswers[currentQIndex] === undefined}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all"
                >
                  <span>{currentQIndex === questions.length - 1 ? 'Finish & Review' : 'Next'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Results & Review */}
          {view === 'results' && (
            <div className="space-y-6">
              {/* Score Header Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50 via-white to-purple-100/50 border border-purple-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
                  <Award className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-gray-900 text-lg">
                  {scorePercent >= 80
                    ? '🎉 Outstanding Mastery!'
                    : scorePercent >= 60
                    ? '👍 Good Effort!'
                    : '📖 Keep Reviewing!'}
                </h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-purple-700">
                    {correctCount} / {questions.length}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    ({scorePercent}%)
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {scorePercent >= 80
                    ? 'You have thoroughly understood the core concepts in this section.'
                    : 'Review the explanations below to reinforce your understanding.'}
                </p>
              </div>

              {/* Question-by-Question Review */}
              <div className="space-y-3.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Detailed Answer Review
                </h5>

                {questions.map((q, qIdx) => {
                  const userChoice = selectedAnswers[qIdx];
                  const isCorrect = userChoice === q.correctAnswerIndex;

                  return (
                    <div
                      key={qIdx}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-rose-200 bg-rose-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-gray-900 leading-snug">
                          {qIdx + 1}. {q.question}
                        </span>
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full shrink-0">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 pl-2 border-l-2 border-purple-200">
                        {q.options.map((opt, oIdx) => {
                          const isUserAnswer = userChoice === oIdx;
                          const isCorrectAnswer = q.correctAnswerIndex === oIdx;

                          if (!isUserAnswer && !isCorrectAnswer) return null;

                          return (
                            <div
                              key={oIdx}
                              className={`text-[11px] font-medium flex items-center gap-2 ${
                                isCorrectAnswer
                                  ? 'text-emerald-800 font-bold'
                                  : 'text-rose-700 line-through'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + oIdx)}.</span>
                              <span>{opt}</span>
                              {isCorrectAnswer && <span className="text-[10px] text-emerald-600 font-normal">(Correct Answer)</span>}
                              {isUserAnswer && !isCorrectAnswer && <span className="text-[10px] text-rose-500 font-normal">(Your Choice)</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      <div className="p-2.5 rounded-xl bg-white/80 border border-purple-100 text-[11px] text-gray-600 leading-relaxed">
                        <strong className="text-purple-800 font-semibold block mb-0.5">Explanation:</strong>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-purple-100">
                <button
                  onClick={() => startQuizGeneration(getGeminiApiKey())}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-purple-700 hover:bg-purple-50 border border-purple-200 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Generate New Quiz</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all"
                >
                  Close & Continue Reading
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
