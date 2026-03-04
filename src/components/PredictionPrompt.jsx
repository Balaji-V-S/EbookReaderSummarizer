import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, BookOpen, SkipForward, Send } from 'lucide-react';

/**
 * PredictionPrompt — shown after a recall card is dismissed.
 * Asks a pre-session question tailored to the book's genre.
 *
 * Props:
 *  isOpen      {bool}
 *  genre       {string | null}  — 'fiction' | 'nonfiction' | null (will ask)
 *  onSubmit    {fn(text, genre)}
 *  onSkip      {fn}
 */
const PredictionPrompt = ({ isOpen, genre: initialGenre, onSubmit, onSkip, onGenreSelect }) => {
    const [text, setText] = useState('');
    const [genre, setGenre] = useState(initialGenre ?? null);

    // Reset state each time the panel opens so re-opening is always fresh
    React.useEffect(() => {
        if (isOpen) {
            setText('');
            setGenre(initialGenre ?? null);
        }
    }, [isOpen, initialGenre]);

    const isFiction = genre === 'fiction';
    const needsGenre = false; // Genre is now collected at Summarize time, not here

    // Fallback question when genre hasn't been set yet
    const question = genre === null
        ? "What's one thing on your mind about this book?"
        : isFiction
            ? "What do you think happens next?"
            : "What are you hoping to learn in this session?";

    const placeholder = genre === null
        ? "e.g. I'm curious about where the story / argument is heading…"
        : isFiction
            ? "e.g. I think the detective will discover the real culprit is…"
            : "e.g. I want to understand how compound interest actually works…";

    const handleSubmit = () => {
        if (!text.trim() || needsGenre) return;
        onSubmit(text.trim(), genre);
        setText('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="prediction-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[90] flex items-end justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
                // Backdrop click intentionally does NOT skip — prevents accidental dismiss on Android
                >
                    <motion.div
                        key="prediction-panel"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-2xl rounded-t-3xl bg-gray-900 border-t border-gray-700 shadow-2xl px-6 pt-6 pb-8"
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />

                        {/* Always go straight to the question — genre is set at Summarize time */}
                        <>
                            {/* Icon + question */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2.5 rounded-xl ${isFiction ? 'bg-indigo-900/40' : genre === null ? 'bg-gray-700/40' : 'bg-emerald-900/40'}`}>
                                    {isFiction
                                        ? <BookOpen size={20} className="text-indigo-400" />
                                        : <Lightbulb size={20} className={genre === null ? 'text-gray-400' : 'text-emerald-400'} />
                                    }
                                </div>
                                <p className="text-white font-semibold text-base leading-snug">{question}</p>
                            </div>

                            {/* Input */}
                            <textarea
                                autoFocus
                                rows={3}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder={placeholder}
                                className="w-full rounded-2xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 text-sm px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                            />

                            {/* Actions */}
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={onSkip}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm hover:text-gray-200 transition-colors"
                                >
                                    <SkipForward size={15} /> Skip
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!text.trim()}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${isFiction
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40'
                                        }`}
                                >
                                    <Send size={15} /> Save my prediction
                                </button>
                            </div>
                        </>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PredictionPrompt;
