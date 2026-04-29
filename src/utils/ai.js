import { tracer, provider as traceProvider } from './tracing.js';

const STORAGE_KEY = 'ai_settings';

export const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'OpenRouter API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://openrouter.ai/keys',
    models: [
      'mistralai/mistral-7b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemma-3-4b-it:free',
      'meta-llama/llama-2-7b-chat:free',
      'nousresearch/nous-hermes-2-mistral-7b-dpo:free',
      'openchat/openchat-3.5:free',
      'gpt-3.5-turbo',
      'gpt-4-turbo',
      'mistralai/mistral-large',
      'meta-llama/llama-3-70b-instruct',
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Google AI Studio API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Groq API Key',
    apiKeyHelp: 'Get your free key at',
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it',
      'gemma-7b-it',
      'mixtral-8x7b-32768',
      'mistral-7b-instruct-v0.2',
    ],
  },
  {
    id: 'together',
    label: 'Together AI',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Together AI API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://api.together.xyz/settings/api-keys',
    models: [
      'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
      'meta-llama/Llama-3-70B-Chat-Turbo',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'mistralai/Mistral-Large-Instruct-2407',
      'google/gemma-2-9b-it',
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
      'teknium/OpenHermes-2.5-Mistral-7B',
    ],
  },
  {
    id: 'deepinfra',
    label: 'DeepInfra',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'DeepInfra API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://deepinfra.com/dash/api_keys',
    models: [
      'meta-llama/Meta-Llama-3.1-70B-Instruct',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'Qwen/Qwen2.5-72B-Instruct',
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
      'mistralai/Mistral-Large',
    ],
  },
  {
    id: 'cohere',
    label: 'Cohere',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Cohere API Key',
    apiKeyHelp: 'Get your free trial key at',
    apiKeyHelpUrl: 'https://dashboard.cohere.com/api-keys',
    models: [
      'command-r-plus',
      'command-r',
      'command-r-v1:7k-token',
      'command-light',
      'command-nightly',
    ],
  },
  {
    id: 'huggingface',
    label: 'HuggingFace',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'HuggingFace Token',
    apiKeyHelp: 'Create a token with Inference API access at',
    apiKeyHelpUrl: 'https://huggingface.co/settings/tokens',
    models: [
      'mistralai/Mistral-7B-Instruct-v0.3',
      'HuggingFaceH4/zephyr-7b-beta',
      'meta-llama/Llama-3.2-3B-Instruct',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'mistralai/Mistral-Large',
      'NousResearch/Nous-Hermes-2-Mistral-7B-DPO',
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    requiresApiKey: false,
    requiresBaseUrl: true,
    apiKeyLabel: null,
    apiKeyHelp: 'Ollama runs locally — no key needed. Install at',
    apiKeyHelpUrl: 'https://ollama.com',
    defaultBaseUrl: 'http://localhost:11434',
    models: [
      'llama3.2',
      'llama3.1',
      'llama2',
      'mistral',
      'neural-chat',
      'gemma3',
      'phi4',
      'dolphin-mixtral',
    ],
  },
];

const DEFAULTS = {
  provider: 'openrouter',
  model: 'mistralai/mistral-7b-instruct:free',
  apiKey: '',
  ollamaBaseUrl: 'http://localhost:11434',
};

const OPENAI_COMPAT_URLS = {
  openrouter: 'https://openrouter.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  deepinfra: 'https://api.deepinfra.com/v1/openai/chat/completions',
};

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

const openAICompatSummary = async (metadata, apiKey, model, providerKey) => {
  const prompt = buildPrompt(metadata);

  const response = await fetch(OPENAI_COMPAT_URLS[providerKey], {
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
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `Failed to generate summary with ${providerKey}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error(`${providerKey} returned an unexpected response structure.`);
  }

  return text;
};

const openRouterSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'openrouter');
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

const groqSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'groq');
};

const togetherSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'together');
};

const deepinfraSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'deepinfra');
};

const cohereSummary = async (metadata, apiKey, model) => {
  const prompt = buildPrompt(metadata);

  const response = await fetch('https://api.cohere.com/v2/chat', {
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
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Failed to generate summary with Cohere');
  }

  const payload = await response.json();
  const text = payload?.message?.content?.[0]?.text;

  if (!text) {
    throw new Error('Cohere returned an unexpected response structure.');
  }

  return text;
};

const huggingFaceSummary = async (metadata, apiKey, model) => {
  const prompt = buildPrompt(metadata);
  const url = `https://api-inference.huggingface.co/models/${model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to generate summary with HuggingFace');
  }

  const payload = await response.json();
  const text = Array.isArray(payload) ? payload[0]?.generated_text : payload?.generated_text;

  if (!text) {
    throw new Error('HuggingFace returned an unexpected response structure.');
  }

  return text;
};

const ollamaSummary = async (metadata, model, baseUrl) => {
  const prompt = buildPrompt(metadata);
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful and concise literary analysis assistant.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to connect to Ollama. Is it running?');
  }

  const payload = await response.json();
  const text = payload?.message?.content;

  if (!text) {
    throw new Error('Ollama returned an unexpected response structure.');
  }

  return text;
};

export const generateSummary = async (metadata) => {
  const { provider, apiKey, model, ollamaBaseUrl } = getAISettings();

  const providerConfig = PROVIDERS.find((p) => p.id === provider);
  if (providerConfig?.requiresApiKey && !apiKey) {
    throw new Error('AI API Key is missing. Please configure it in Settings.');
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
      } else if (provider === 'groq') {
        result = await groqSummary(metadata, apiKey, model);
      } else if (provider === 'together') {
        result = await togetherSummary(metadata, apiKey, model);
      } else if (provider === 'deepinfra') {
        result = await deepinfraSummary(metadata, apiKey, model);
      } else if (provider === 'gemini') {
        result = await geminiSummary(metadata, apiKey, model);
      } else if (provider === 'cohere') {
        result = await cohereSummary(metadata, apiKey, model);
      } else if (provider === 'huggingface') {
        result = await huggingFaceSummary(metadata, apiKey, model);
      } else if (provider === 'ollama') {
        const baseUrl = ollamaBaseUrl || 'http://localhost:11434';
        result = await ollamaSummary(metadata, model, baseUrl);
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
