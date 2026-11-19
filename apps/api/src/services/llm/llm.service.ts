import { GoogleGenAI } from '@google/genai';
import { logger } from '../../lib/logger';

const log = logger.child('LLMService');

async function callOllama(prompt: string, timeoutMs: number): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { response?: string };
    const text = data.response || '';
    if (!text.trim()) {
      throw new Error('Ollama returned empty text');
    }
    return text.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Ollama text generation timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Ollama text generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function callGroq(prompt: string, timeoutMs: number): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured in the environment.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content || '';
    if (!text.trim()) {
      throw new Error('Groq returned empty text');
    }
    return text.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Groq text generation timed out after ${timeoutMs}ms`);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

async function callGemini(prompt: string, timeoutMs: number): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
    });
    clearTimeout(timeoutId);
    const text = response.text || '';
    if (!text.trim()) {
      throw new Error('Gemini returned empty text');
    }
    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Gemini text generation timed out after ${timeoutMs}ms`);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('Quota exceeded')
  );
}

export async function generateText(prompt: string, timeoutMs = 120000): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  // 1. Ollama requested
  if (provider === 'ollama') {
    try {
      return await callOllama(prompt, timeoutMs);
    } catch (err) {
      log.warn('Ollama call failed; checking for available fallback:', err);
      if (process.env.GROQ_API_KEY) {
        log.info('Falling back to Groq from Ollama...');
        return await callGroq(prompt, timeoutMs);
      }
      if (process.env.GEMINI_API_KEY) {
        log.info('Falling back to Gemini from Ollama...');
        return await callGemini(prompt, timeoutMs);
      }
      throw err;
    }
  }

  // 2. Groq explicitly requested
  if (provider === 'groq') {
    try {
      return await callGroq(prompt, timeoutMs);
    } catch (err) {
      log.warn('Groq call failed:', err);
      if (process.env.GEMINI_API_KEY && !isQuotaOrRateLimitError(err)) {
        log.info('Falling back to Gemini from Groq...');
        return await callGemini(prompt, timeoutMs);
      }
      throw err;
    }
  }

  // 3. Gemini requested (default)
  try {
    return await callGemini(prompt, timeoutMs);
  } catch (err) {
    if (process.env.GROQ_API_KEY) {
      const isQuota = isQuotaOrRateLimitError(err);
      log.warn(
        `Gemini call failed (${isQuota ? 'Quota Exceeded / 429' : 'Error'}). Seamlessly falling back to Groq...`,
        err instanceof Error ? err.message : err
      );
      return await callGroq(prompt, timeoutMs);
    }
    throw err;
  }
}
