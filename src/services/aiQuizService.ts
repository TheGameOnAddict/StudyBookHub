import type { QuizQuestion } from '../types';

const GEMINI_API_KEY_STORAGE = 'studybook_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'studybook_gemini_model';

/**
 * Priority list of candidate Gemini models to try when generating content
 */
const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
];

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
 * Retrieve saved/detected Gemini model name from localStorage
 */
export function getGeminiModel(): string {
  return localStorage.getItem(GEMINI_MODEL_STORAGE) || '';
}

/**
 * Save detected Gemini model name to localStorage
 */
export function setGeminiModel(model: string): void {
  localStorage.setItem(GEMINI_MODEL_STORAGE, model.trim());
}

/**
 * Remove saved Gemini API Key and cached model
 */
export function removeGeminiApiKey(): void {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  localStorage.removeItem(GEMINI_MODEL_STORAGE);
}

/**
 * Check if a Gemini API Key is configured
 */
export function hasGeminiApiKey(): boolean {
  return !!getGeminiApiKey().trim();
}

/**
 * Dynamically queries Google's ListModels API for the user's API key
 * and selects the best available model supporting generateContent.
 */
export async function discoverBestGeminiModel(
  apiKey: string,
  forceRefresh = false
): Promise<string> {
  const cached = getGeminiModel();
  if (cached && !forceRefresh) {
    return cached;
  }

  const cleanKey = apiKey.trim();
  if (!cleanKey) return CANDIDATE_MODELS[0];

  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;

  try {
    const res = await fetch(listUrl);
    if (res.ok) {
      const data = await res.json();
      const models: Array<{ name: string; supportedGenerationMethods?: string[] }> =
        data?.models || [];

      const contentModels = models.filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
      );

      if (contentModels.length > 0) {
        // 1. Priority match from candidate list
        for (const candidate of CANDIDATE_MODELS) {
          const match = contentModels.find(
            (m) =>
              m.name === `models/${candidate}` ||
              m.name === candidate ||
              m.name.endsWith(`/${candidate}`)
          );
          if (match) {
            const chosen = match.name.replace(/^models\//, '');
            setGeminiModel(chosen);
            return chosen;
          }
        }

        // 2. Any model with 'flash' in its name
        const flashMatch = contentModels.find((m) =>
          m.name.toLowerCase().includes('flash')
        );
        if (flashMatch) {
          const chosen = flashMatch.name.replace(/^models\//, '');
          setGeminiModel(chosen);
          return chosen;
        }

        // 3. Any model with 'gemini' in its name
        const anyGemini = contentModels.find((m) =>
          m.name.toLowerCase().includes('gemini')
        );
        if (anyGemini) {
          const chosen = anyGemini.name.replace(/^models\//, '');
          setGeminiModel(chosen);
          return chosen;
        }

        // 4. First available content model
        const firstSupported = contentModels[0].name.replace(/^models\//, '');
        setGeminiModel(firstSupported);
        return firstSupported;
      }
    }
  } catch (e) {
    console.warn('Could not query Gemini ListModels endpoint:', e);
  }

  // Default fallback if list is unavailable
  return CANDIDATE_MODELS[0]; // gemini-2.0-flash
}

/**
 * Lightweight helper to test generateContent for a specific model
 */
async function testModelPing(
  apiKey: string,
  modelName: string
): Promise<{ ok: boolean; status: number; errorMsg?: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Ping test. Reply with "OK".' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: response.status,
        errorMsg:
          errData?.error?.message ||
          `Google API returned status ${response.status} (${response.statusText})`,
      };
    }

    return { ok: true, status: 200 };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      errorMsg: err?.message || 'Network error while contacting Google Gemini API.',
    };
  }
}

/**
 * Validate Gemini API Key with dynamic model discovery and fallback verification
 */
export async function validateGeminiApiKey(
  apiKey: string
): Promise<{ valid: boolean; model?: string; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  try {
    // 1. Discover the best model reported by Google for this key
    const primaryModel = await discoverBestGeminiModel(cleanKey, true);

    // 2. Perform test ping with the discovered model
    const testResult = await testModelPing(cleanKey, primaryModel);
    if (testResult.ok) {
      setGeminiModel(primaryModel);
      return { valid: true, model: primaryModel };
    }

    // 3. If invalid key error (400/403 with API_KEY_INVALID), return immediately
    const errorMsg = testResult.errorMsg || '';
    if (
      testResult.status === 400 &&
      (errorMsg.toLowerCase().includes('api key') ||
        errorMsg.toLowerCase().includes('invalid'))
    ) {
      return { valid: false, error: errorMsg };
    }

    // 4. If primary model was not found or unsupported, iterate through candidate models
    for (const candidate of CANDIDATE_MODELS) {
      if (candidate === primaryModel) continue;

      const candidateTest = await testModelPing(cleanKey, candidate);
      if (candidateTest.ok) {
        setGeminiModel(candidate);
        return { valid: true, model: candidate };
      }
    }

    return {
      valid: false,
      error:
        testResult.errorMsg ||
        'No compatible Gemini models were found for this API key. Please verify your key in Google AI Studio.',
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Network error while contacting Google Gemini API.',
    };
  }
}

/**
 * Internal helper to send the quiz prompt to a specific Gemini model
 */
async function callGeminiGenerateQuiz(
  apiKey: string,
  modelName: string,
  prompt: string,
  numQuestions: number
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
  const rawContent = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawContent) {
    throw new Error('Gemini did not return any quiz questions.');
  }

  return rawContent;
}

/**
 * Generates an interactive pop quiz from textbook chapter text using Google Gemini
 * with automatic model discovery and resilient fallback.
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

  // Determine initial model to use
  let activeModel = getGeminiModel() || (await discoverBestGeminiModel(cleanKey));

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

  let rawContent: string | null = null;

  try {
    rawContent = await callGeminiGenerateQuiz(cleanKey, activeModel, prompt, numQuestions);
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    // If model is not found or not supported, try discovery and fallback models
    if (
      errMsg.includes('not found') ||
      errMsg.includes('not supported') ||
      errMsg.includes('404')
    ) {
      console.warn(`Model ${activeModel} failed with: ${errMsg}. Attempting fallback discovery...`);
      const freshModel = await discoverBestGeminiModel(cleanKey, true);

      if (freshModel && freshModel !== activeModel) {
        try {
          rawContent = await callGeminiGenerateQuiz(cleanKey, freshModel, prompt, numQuestions);
          setGeminiModel(freshModel);
        } catch {
          // Continue to candidate loop below
        }
      }

      if (!rawContent) {
        for (const candidate of CANDIDATE_MODELS) {
          if (candidate === activeModel || candidate === freshModel) continue;
          try {
            rawContent = await callGeminiGenerateQuiz(cleanKey, candidate, prompt, numQuestions);
            setGeminiModel(candidate);
            break;
          } catch {
            // continue trying
          }
        }
      }
    }

    if (!rawContent) {
      throw err;
    }
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
  } catch {
    // Regex fallback to locate JSON object or array
    const jsonMatch = rawContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.error('Failed to parse Gemini JSON output:', rawContent, parseErr);
        throw new Error('Failed to parse quiz questions from AI response.');
      }
    } else {
      console.error('Failed to parse Gemini JSON output:', rawContent);
      throw new Error('Failed to parse quiz questions from AI response.');
    }
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
