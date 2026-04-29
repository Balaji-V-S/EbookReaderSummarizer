import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Brain, Search, Send, BookMarked, Loader, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllEntries } from '../utils/storage';

// ────────────────────────────────────────────────────────────────────────────
// Client-side keyword search over entries (no embeddings / external API needed)
// Returns entries ranked by relevance to the query.
const searchEntries = (query, entries) => {
    if (!query.trim() || !entries.length) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (!terms.length) return entries.slice(0, 8);

    const scored = entries.map(e => {
        const haystack = [e.quote, e.myNote, e.bookTitle, e.bookAuthor, ...(e.tags || [])].join(' ').toLowerCase();
        let score = 0;
        for (const term of terms) {
            const count = (haystack.match(new RegExp(term, 'g')) || []).length;
            // More weight to matches in notes (user's own thinking) and tags
            score += count;
            if ((e.myNote || '').toLowerCase().includes(term)) score += 2;
            if ((e.tags || []).some(t => t.includes(term))) score += 2;
        }
        return { entry: e, score };
    });

    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(s => s.entry);
};

// ────────────────────────────────────────────────────────────────────────────
// Build a Gemini prompt from the query + relevant entry context
const buildRAGPrompt = (question, relevantEntries) => {
    const context = relevantEntries.map((e, i) =>
        `[${i + 1}] From "${e.bookTitle}" by ${e.bookAuthor}${e.chapter ? ` (${e.chapter})` : ''}:\nQuote: "${e.quote}"${e.myNote ? `\nMy note: ${e.myNote}` : ''}`
    ).join('\n\n');

    return `You are a personal knowledge assistant for a reader. Your job is to answer questions using ONLY the passages the reader has saved from their books.

Below are the reader's saved passages that may be relevant to their question:

${context}

The reader asks: "${question}"

INSTRUCTIONS:
- Answer based ONLY on the provided passages above. Do not use outside knowledge.
- Be direct and concise (150–250 words max).
- Reference specific passages using [1], [2], etc. notation when you draw from them.
- If the passages don't fully answer the question, say so honestly and suggest what else they might read / highlight.
- Write in warm, first-person conversational prose. No bullet points or headers.
- Start with the direct answer, then expand.`;
};

// ────────────────────────────────────────────────────────────────────────────
const CitedEntry = ({ entry, index }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button
                onClick={() => setExpanded(p => !p)}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center mt-0.5">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{entry.bookTitle} · {entry.bookAuthor}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 italic line-clamp-2 mt-0.5">"{entry.quote}"</p>
                </div>
                {expanded ? <ChevronUp size={14} className="flex-shrink-0 text-gray-400 mt-0.5" /> : <ChevronDown size={14} className="flex-shrink-0 text-gray-400 mt-0.5" />}
            </button>
            {expanded && entry.myNote && (
                <div className="px-11 pb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/30">
                        <span className="font-semibold">Your note:</span> {entry.myNote}
                    </p>
                </div>
            )}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
const KnowledgeBase = ({ onBack }) => {
    const [entries, setEntries] = useState([]);
    const [loadingEntries, setLoadingEntries] = useState(true);
    const [question, setQuestion] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [answer, setAnswer] = useState('');
    const [citedEntries, setCitedEntries] = useState([]);
    const [error, setError] = useState('');
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kb_history') || '[]'); } catch { return []; }
    });
    const inputRef = useRef(null);
    const answerRef = useRef(null);

    useEffect(() => {
        getAllEntries().then(all => { setEntries(all); setLoadingEntries(false); });
    }, []);

    const handleAsk = useCallback(async (q) => {
        const query = (q || question).trim();
        if (!query) return;

        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) {
            setError('No Gemini API key found. Add it in Settings.');
            return;
        }
        if (entries.length === 0) {
            setError('Your Commonplace Book is empty. Save some passages while reading first!');
            return;
        }

        setIsThinking(true);
        setAnswer('');
        setCitedEntries([]);
        setError('');

        try {
            // Step 1: Local keyword search
            const relevant = searchEntries(query, entries);
            if (relevant.length === 0) {
                setError("I couldn't find any saved passages related to that question. Try saving more entries on this topic while reading.");
                return;
            }
            setCitedEntries(relevant);

            // Step 2: RAG call to Gemini
            const prompt = buildRAGPrompt(query, relevant);
            const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Gemini API error');
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            setAnswer(text);

            // Save to history
            const entry = { question: query, answer: text, timestamp: Date.now(), citedCount: relevant.length };
            const newHistory = [entry, ...history].slice(0, 20);
            setHistory(newHistory);
            localStorage.setItem('kb_history', JSON.stringify(newHistory));

            setTimeout(() => answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsThinking(false);
        }
    }, [question, entries, history]);

    const handleSubmit = (e) => {
        e.preventDefault();
        handleAsk();
    };

    const SUGGESTIONS = [
        'What have I read about motivation and habits?',
        'What ideas about leadership have I saved?',
        'What passages moved me the most emotionally?',
        'What have I learned about decision-making?',
    ];

    return (
        <div className="flex-1 flex flex-col bg-[#fafaf8] dark:bg-gray-900 min-h-0 overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-8 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Brain size={20} className="text-violet-500" />
                            Knowledge Base
                        </h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Ask questions — answers come from your Commonplace Book entries
                        </p>
                    </div>
                </div>
            </header>

            {/* ── Scrollable content ──────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5">

                {/* Entry count notice */}
                {!loadingEntries && (
                    <div className={`mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${entries.length > 0 ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/30'}`}>
                        <BookMarked size={15} />
                        {entries.length > 0
                            ? <span>Searching across <strong>{entries.length}</strong> saved {entries.length === 1 ? 'entry' : 'entries'} from your Commonplace Book.</span>
                            : <span>No entries yet. Save passages while reading to power this feature.</span>
                        }
                    </div>
                )}

                {/* Suggestions */}
                {!answer && !isThinking && entries.length > 0 && (
                    <div className="mb-5">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Try asking…</p>
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setQuestion(s); handleAsk(s); }}
                                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-600 dark:hover:text-violet-400 transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isThinking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-12 gap-3"
                    >
                        <Loader size={28} className="text-violet-500 animate-spin" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Searching your notes and thinking…</p>
                    </motion.div>
                )}

                {/* Error */}
                {error && !isThinking && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 dark:text-red-300"
                    >
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Answer */}
                <AnimatePresence>
                    {answer && !isThinking && (
                        <motion.div
                            ref={answerRef}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mb-5"
                        >
                            {/* Question echo */}
                            <div className="flex justify-end mb-3">
                                <div className="max-w-[80%] bg-violet-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm shadow-violet-500/20">
                                    {question}
                                </div>
                            </div>

                            {/* Answer bubble */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm px-5 py-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Brain size={14} className="text-violet-500" />
                                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">From your notes</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{answer}</p>
                            </div>

                            {/* Cited entries */}
                            {citedEntries.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        Passages used ({citedEntries.length})
                                    </p>
                                    <div className="space-y-2">
                                        {citedEntries.map((e, i) => <CitedEntry key={e.id} entry={e} index={i} />)}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recent questions */}
                {history.length > 0 && !answer && !isThinking && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent questions</p>
                            <button
                                onClick={() => { setHistory([]); localStorage.removeItem('kb_history'); }}
                                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                            >
                                <Trash2 size={11} /> Clear
                            </button>
                        </div>
                        <div className="space-y-2">
                            {history.slice(0, 5).map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setQuestion(h.question); handleAsk(h.question); }}
                                    className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors group"
                                >
                                    <p className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{h.question}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{h.citedCount} passages · {new Date(h.timestamp).toLocaleDateString()}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Input bar ───────────────────────────────────────────────── */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
                <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                        placeholder="What have I read about…?"
                        rows={1}
                        className="flex-1 resize-none rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-violet-400/50 transition-all max-h-32 overflow-y-auto"
                        style={{ scrollbarWidth: 'none' }}
                    />
                    <button
                        type="submit"
                        disabled={isThinking || !question.trim()}
                        className="flex-shrink-0 w-11 h-11 rounded-2xl bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm shadow-violet-500/25"
                    >
                        {isThinking ? <Loader size={18} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default KnowledgeBase;
