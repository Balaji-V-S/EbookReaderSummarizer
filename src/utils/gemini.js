const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Internal helper to call the Gemini API with OpenTelemetry tracing
const callGemini = async (prompt, spanName, apiKey, useSearch = false) => {
  const { tracer, provider } = await import('./tracing.js');
  const { SpanStatusCode } = await import('@opentelemetry/api');

  return await tracer.startActiveSpan(spanName, async (span) => {
    span.setAttribute('openinference.span.kind', 'LLM');
    span.setAttribute('llm.model_name', 'gemini-2.5-flash');
    span.setAttribute('llm.provider', 'Google');
    span.setAttribute('input.value', prompt);
    span.setAttribute('input.mime_type', 'text/plain');

    try {
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
      };
      if (useSearch) body.tools = [{ googleSearch: {} }];

      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to call Gemini API');
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      span.setAttribute('output.value', responseText);
      span.setStatus({ code: SpanStatusCode.OK });
      const usage = data.usageMetadata;
      if (usage) {
        span.setAttribute('llm.token_count.prompt', usage.promptTokenCount ?? 0);
        span.setAttribute('llm.token_count.completion', usage.candidatesTokenCount ?? 0);
        span.setAttribute('llm.token_count.total', usage.totalTokenCount ?? 0);
      }
      return responseText;
    } catch (error) {
      console.error('Gemini API Error:', error);
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
      if (provider && typeof provider.forceFlush === 'function') {
        setTimeout(() => provider.forceFlush().catch(console.error), 0);
      }
    }
  });
};

export const generateSummary = async (metadata, apiKey) => {
  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;

  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end 
    ? `\n  - **The current chapter begins with:** "${anchors.start}..."\n  - **The current chapter ends near:** "${anchors.end}..."` 
    : '';

  const summaryType = localStorage.getItem('gemini_summary_type') || 'fiction';
  let typeInstructions = '';

  if (summaryType === 'fiction') {
    typeInstructions = `
  **Structure your response as follows:**
  1.  **The Story So Far:** A bulleted list of the key plot points leading up to this exact moment. Focus heavily on what happened in the chapters immediately preceding this one.
  2.  **Key Characters:** A bulleted list of 2-4 main characters and exactly what situation they are currently in.
  3.  **Current Situation:** A single sentence setting the stage for what the reader is about to read next.`;
  } else if (summaryType === 'non-fiction') {
    typeInstructions = `
  **Structure your response as follows:**
  1.  **Core Arguments & Facts:** A bulleted list of the main factual points or arguments the author has presented leading up to this point. Include key evidence or examples used.
  2.  **Key Takeaways:** A bulleted list of 2-4 actionable or important takeaways from the recent chapters.
  3.  **Current Focus:** A single sentence summarizing the topic the author is currently discussing.`;
  } else if (summaryType === 'technical') {
    typeInstructions = `
  **Structure your response as follows:**
  1.  **Key Concepts & Definitions:** A bulleted list of the technical terms, concepts, or methodologies introduced so far. Focus heavily on those from the most recent chapters.
  2.  **Core Processes:** A bulleted list of 2-4 important processes, architectures, or code structures outlined by the author.
  3.  **Current Focus:** A single sentence summarizing the specific technical topic the author is currently explaining.`;
  }

  const prompt = `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.
  PLEASE USE GOOGLE SEARCH to find detailed, accurate plot summaries of this specific book to ensure your answer is perfectly accurate.
  
  **User's Current Position:**
  - **Progress:** ${(parseFloat(progress) * 100).toFixed(1)}% through the book
  - **Chapters they have already finished:** ${chapterList}
  - **They just finished reading the chapter:** ${chapterName || 'Unknown'}${anchorContext}
  
  **Task:**
  Provide a **detailed but concise** summary of the specific events, facts, or concepts that occurred *leading up to exactly this point* in the book.
  Be extremely careful NOT to spoil anything that happens after the chapter they just finished.
  ${typeInstructions}
  
  Keep the total output under 400 words. Use Markdown (bold, bullet points).`;

  return callGemini(prompt, 'gemini.generateSummary', apiKey, true);
};

/**
 * Generates a warm, narrative recall card for a reader returning after an absence.
 * @param {object} metadata  - { title, author, chapterName, progress, previousChapters, anchors }
 * @param {string} apiKey
 * @param {'quick'|'standard'|'detailed'} length
 */
export const generateRecall = async (metadata, apiKey, length = 'standard') => {
  if (!apiKey) throw new Error('API Key is missing');

  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;

  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'the beginning';

  const anchorContext = anchors?.start
    ? `The last section they were reading started with: "${anchors.start}..."`
    : '';

  const lengthInstructions = {
    quick: 'Respond in exactly 2 warm, engaging sentences. Be concise but evocative.',
    standard: 'Respond in 150–200 words of flowing, warm narrative prose.',
    detailed: 'Respond in up to 400 words of rich, warm narrative prose.',
  };

  const prompt = `You are a warm, enthusiastic reading companion for the Atheneum app.

The user is returning to read "${title}" by ${author} after being away for a few days.
They are ${(parseFloat(progress) * 100).toFixed(0)}% through the book.
Chapters they have already read: ${chapterList}.
They were last reading chapter: "${chapterName || 'an early section'}".
${anchorContext}

Your task: Write a friendly, narrative recap to help them remember where they left off — like a knowledgeable friend catching them up before they dive back in.

CRITICAL RULES:
- Write in warm, flowing PROSE. DO NOT use bullet points, headers, or lists.
- DO NOT spoil anything that happens AFTER "${chapterName}". Only recap what has already happened.
- DO NOT invent plot points. If you are unsure, be vague and focus on tone and character feelings.
- ${lengthInstructions[length]}
- End with a single short sentence of encouragement to jump back in.`;

  return callGemini(prompt, 'gemini.generateRecall', apiKey, false);
};

/**
 * Generates an orientation card for a book the user is opening for the very first time.
 * @param {object} metadata - { title, author }
 * @param {string} apiKey
 */
export const generateOrientation = async (metadata, apiKey) => {
  if (!apiKey) throw new Error('API Key is missing');

  const { title, author } = metadata;

  const prompt = `You are a warm, enthusiastic reading companion for the Atheneum app.

The user is about to start reading "${title}" by ${author} for the very first time.

Your task: Write a short, enticing orientation to set the scene — like a knowledgeable friend giving a warm introduction before they begin.

CRITICAL RULES:
- Write in warm, flowing PROSE. DO NOT use bullet points, headers, or lists.
- DO NOT reveal major plot twists, endings, or significant spoilers.
- Cover: the genre/tone, the world or setting, and the emotional experience readers can expect.
- Keep it to exactly 100–150 words.
- End with a single short sentence of excitement to encourage them to begin.`;

  return callGemini(prompt, 'gemini.generateOrientation', apiKey, false);
};

/**
 * Contextually explains a selected passage in the context of the current book/scene.
 * @param {object} ctx - { selectedText, bookTitle, bookAuthor, chapterName, surroundingText }
 * @param {string} apiKey
 */
export const generateExplain = async (ctx, apiKey) => {
  if (!apiKey) throw new Error('API Key is missing');

  const { selectedText, bookTitle, bookAuthor, chapterName, surroundingText } = ctx;

  const contextBlock = surroundingText
    ? `\n\nThe passage around the selection (for scene context):\n"...${surroundingText}..."`
    : '';

  const prompt = `You are an insightful literary companion inside the Atheneum reading app.

The reader is reading "${bookTitle}" by ${bookAuthor}, currently in "${chapterName || 'an early chapter'}".

They have selected the following text:
"${selectedText}"
${contextBlock}

Your task: Explain this selection in a way that is deeply useful to THIS reader at THIS moment.

RULES:
- Explain what this means in the context of the scene, characters, themes, and tone of the book.
- If it's a word or phrase, explain its meaning AND its narrative significance here.
- If it's a concept, metaphor, or reference (literary, historical, cultural), explain what it means and why the author used it.
- Write in clear, warm, engaging prose. Maximum 200 words. No bullet points.
- Do NOT spoil events that happen after the current chapter.`;

  return callGemini(prompt, 'gemini.generateExplain', apiKey, false);
};

/**
 * Answers a user follow-up question about previously explained text.
 * @param {object} ctx - { selectedText, explanation, question, bookTitle, bookAuthor, chapterName }
 * @param {string} apiKey
 */
export const generateFollowUp = async (ctx, apiKey) => {
  if (!apiKey) throw new Error('API Key is missing');

  const { selectedText, explanation, question, bookTitle, bookAuthor, chapterName } = ctx;

  const prompt = `You are an insightful literary companion inside the Atheneum reading app.

The reader is reading "${bookTitle}" by ${bookAuthor}, in "${chapterName || 'an early chapter'}".

The selected passage: "${selectedText}"

You already explained: "${explanation}"

The reader now asks: "${question}"

Answer their follow-up question concisely and helpfully in 100–150 words. Warm tone, plain prose. No bullet points. Do not spoil future events.`;

  return callGemini(prompt, 'gemini.generateFollowUp', apiKey, false);
};
