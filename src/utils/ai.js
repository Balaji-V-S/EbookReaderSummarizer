import { tracer, provider as traceProvider } from './tracing.js';

const STORAGE_KEY = 'ai_settings';
const DEFAULTS = {
  provider: 'openrouter',
  model: 'gpt-4o-mini',
  apiKey: '',
};

const OPENROUTER_URL = 'https://openrouter.ai/v1/chat/completions';

const buildPrompt = (metadata) => {
  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;

  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end
    ? `\n- The current chapter begins with: "${anchors.start}..."\n- It ends near: "${anchors.end}..."`
    : '';

  return `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.

User current position:
- Progress: ${(parseFloat(progress) * 100).toFixed(1)}% through the book
- Chapters already finished: ${chapterList}
- Just finished reading: ${chapterName || 'Unknown'}${anchorContext}

Task:
Provide a concise summary of the plot events that led up to this exact point in the book.
Do not include spoilers for events that happen after this chapter.

Structure your response as markdown with bullets, a short key characters section, and a one-sentence current situation description.
Keep it under 400 words.`;
};

export const getAISettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULTS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }

  const legacyKey = localStorage.getItem('gemini_api_key');
  if (legacyKey) {
    return {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: legacyKey,
    };
  }

  return DEFAULTS;
};

export const saveAISettings = (settings) => {
  const merged = { ...DEFAULTS, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
};

const openRouterSummary = async (metadata, apiKey, model) => {
  const prompt = buildPrompt(metadata);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful and concise literary analysis assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'Failed to generate summary with OpenRouter');
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenRouter returned an unexpected response structure.');
  }

  return text;
};

const geminiSummary = async (metadata, apiKey, model) => {
  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;
  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end
    ? `\n  - **The current chapter begins with:** "${anchors.start}..."\n  - **The current chapter ends near:** "${anchors.end}..."`
    : '';

  const prompt = `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.

**User's Current Position:**
- **Progress:** ${(parseFloat(progress) * 100).toFixed(1)}% through the book
- **Chapters already finished:** ${chapterList}
- **Just finished reading:** ${chapterName || 'Unknown'}${anchorContext}

Provide a detailed but concise summary of the specific plot events that occurred leading up to this point in the book. Avoid spoilers for what happens after this chapter.
Structure the answer as markdown with bullet points, a short key characters section, and a one-sentence current situation summary.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'Failed to generate summary with Gemini');
  }

  const data = await response.json();
  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Gemini returned an unexpected response structure.');
  }

  return responseText;
};

export const generateSummary = async (metadata) => {
  const { provider, apiKey, model } = getAISettings();

  if (!apiKey) {
    throw new Error('AI API Key is missing');
  }

  return tracer.startActiveSpan('ai.generateSummary', async (span) => {
    span.setAttribute('llm.provider', provider);
    span.setAttribute('llm.model_name', model);
    span.setAttribute('input.value', JSON.stringify(metadata));
    span.setAttribute('input.mime_type', 'text/plain');

    try {
      let result;
      if (provider === 'openrouter') {
        result = await openRouterSummary(metadata, apiKey, model);
      } else if (provider === 'gemini') {
        result = await geminiSummary(metadata, apiKey, model);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      span.setAttribute('output.value', result);
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
      if (traceProvider && typeof traceProvider.forceFlush === 'function') {
        setTimeout(() => traceProvider.forceFlush().catch(console.error), 0);
      }
    }
  });
};
