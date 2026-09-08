import type { QuizQuestion } from '../types';

const GEMINI_API_KEY_STORAGE = 'studybook_gemini_api_key';

/**
 * Retrieve saved Gemini API Key from localStorage
 */
export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
}

/**
 * Save Gemini API Key to localStorage
 */
export function setGeminiApiKey(key: string): void {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
}

/**
 * Remove saved Gemini API Key
 */
export function removeGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
}

/**
 * Check if a Gemini API Key is configured
 */
export function hasGeminiApiKey(): boolean {
  return !!getGeminiApiKey().trim();
}

/**
 * Validate Gemini API Key with a lightweight test request
 */
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping test. Reply with "OK".' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message =
        errData?.error?.message ||
        `Google API returned status ${response.status} (${response.statusText})`;
      return { valid: false, error: message };
    }

    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Network error while contacting Google Gemini API.',
    };
  }
}

/**
 * Generates an interactive pop quiz from textbook chapter text using Google Gemini
 */
export async function generateChapterQuiz(
  apiKey: string,
  chapterTitle: string,
  chapterText: string,
  numQuestions: number = 3
): Promise<QuizQuestion[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is required. Please add your key in the quiz settings.');
  }

  if (!chapterText.trim()) {
    throw new Error('No readable text found in this chapter. The pages may be scanned images.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const prompt = `You are an expert textbook tutor. Generate a high-yield, engaging pop quiz of exactly ${numQuestions} multiple-choice questions based on the following chapter text.

Chapter Title: "${chapterTitle}"

Text Content:
"""
${chapterText}
"""

Guidelines:
1. Each question must test core comprehension and conceptual understanding from the provided text, NOT trivial trivia or arbitrary page numbers.
2. Provide exactly 4 plausible options for each question.
3. Indicate the zero-based index of the correct answer (0, 1, 2, or 3).
4. Provide a clear, educational 1-2 sentence explanation of why the correct answer is right and reinforces learning.
5. Format the output strictly as a JSON object matching the requested schema.`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          questions: {
            type: 'ARRAY',
            description: `List of ${numQuestions} quiz questions.`,
            items: {
              type: 'OBJECT',
              properties: {
                question: { type: 'STRING', description: 'The question prompt.' },
                options: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                  description: 'Exactly 4 multiple choice options.',
                },
                correctAnswerIndex: {
                  type: 'INTEGER',
                  description: 'Zero-based index of the correct answer (0 to 3).',
                },
                explanation: {
                  type: 'STRING',
                  description: 'Clear educational explanation of the answer.',
                },
              },
              required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
            },
          },
        },
        required: ['questions'],
      },
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message =
      errData?.error?.message ||
      `Gemini request failed with status ${response.status} (${response.statusText})`;
    throw new Error(message);
  }

  const result = await response.json();
  const rawContent =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawContent) {
    throw new Error('Gemini did not return any quiz questions.');
  }

  let parsed: any;
  try {
    // Strip markdown code fences if present
    const cleanedJson = rawContent
      .replace(/^```json/im, '')
      .replace(/^```/im, '')
      .replace(/```$/im, '')
      .trim();
    parsed = JSON.parse(cleanedJson);
  } catch (parseErr) {
    console.error('Failed to parse Gemini JSON output:', rawContent, parseErr);
    throw new Error('Failed to parse quiz questions from AI response.');
  }

  const questionsList = parsed.questions || parsed;
  if (!Array.isArray(questionsList) || questionsList.length === 0) {
    throw new Error('AI returned an empty quiz. Please try again.');
  }

  return questionsList.map((q: any, idx: number): QuizQuestion => {
    const rawOptions: string[] = Array.isArray(q.options) ? q.options : [];
    const sanitizedOptions = rawOptions.map((opt) => String(opt).trim()).filter(Boolean);
    const correctIdx =
      typeof q.correctAnswerIndex === 'number' &&
      q.correctAnswerIndex >= 0 &&
      q.correctAnswerIndex < sanitizedOptions.length
        ? q.correctAnswerIndex
        : 0;

    return {
      id: `q_${Date.now()}_${idx}`,
      question: String(q.question || `Question ${idx + 1}`).trim(),
      options: sanitizedOptions.length >= 2 ? sanitizedOptions : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: correctIdx,
      explanation: String(q.explanation || 'No explanation provided.').trim(),
    };
  });
}
