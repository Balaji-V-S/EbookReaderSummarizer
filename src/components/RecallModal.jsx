import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, RefreshCw, Zap, X } from 'lucide-react';

const LENGTHS = [
    { key: 'quick', label: 'Quick', desc: '2 sentences' },
    { key: 'standard', label: 'Standard', desc: '~200 words' },
    { key: 'detailed', label: 'Detailed', desc: '~400 words' },
];

const SkeletonLoader = () => (
    <div className="space-y-3 animate-pulse" aria-label="Loading recall...">
        <div className="h-4 bg-white/20 rounded-full w-full" />
        <div className="h-4 bg-white/20 rounded-full w-5/6" />
        <div className="h-4 bg-white/20 rounded-full w-full" />
        <div className="h-4 bg-white/20 rounded-full w-4/6" />
        <div className="h-4 bg-white/20 rounded-full w-full" />
        <div className="h-4 bg-white/20 rounded-full w-3/4" />
    </div>
);

/**
 * RecallModal — shown when a user returns to a book after 3+ days,
 * or when opening a book for the first time (orientation mode).
 *
 * Props:
 *  isOpen {bool}
 *  onClose {fn}           — called when user clicks "Resume Reading"
 *  recallText {string}    — the generated narrative text
 *  isLoading {bool}
 *  isOrientation {bool}   — true = first-time open, false = returning reader
 *  activeLength {string}  — 'quick' | 'standard' | 'detailed'
 *  onLengthChange {fn}    — called with new length key; triggers regeneration
 *  error {string|null}    — optional error message
 */
const RecallModal = ({
    isOpen,
    onClose,
    onGenerate,     // fn(length) — called to kick off the API fetch
    recallText,
    isLoading,
    isOrientation = false,
    activeLength = 'standard',
    onLengthChange, // fn(length) — called when tab is clicked; re-generates only if already loaded
    error = null,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="recall-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,10,60,0.97) 100%)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <motion.div
                        key="recall-card"
                        initial={{ opacity: 0, y: 32, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                        style={{
                            background: 'linear-gradient(160deg, rgba(88,28,135,0.45) 0%, rgba(30,64,175,0.4) 100%)',
                            border: '1px solid rgba(168,85,247,0.3)',
                            maxHeight: '90vh',
                        }}
                    >
                        {/* Glow accent */}
                        <div
                            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-30 blur-3xl"
                            style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
                        />

                        {/* Header */}
                        <div className="relative px-6 pt-8 pb-4 flex flex-col items-center text-center gap-3">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-purple-200/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                            >
                                <Sparkles size={26} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    {isOrientation ? "Welcome to your book" : "Welcome back!"}
                                </h2>
                                <p className="text-sm text-purple-200/80 mt-0.5">
                                    {isOrientation
                                        ? "Here's a quick introduction before you dive in"
                                        : !recallText && !isLoading && !error
                                            ? "Pick a length and get caught up before you dive back in"
                                            : "Here's what's happened so far…"}
                                </p>
                            </div>
                        </div>

                        {/* Length Selector — only for returning readers */}
                        {!isOrientation && (
                            <div className="px-6 pb-2 flex gap-2 justify-center">
                                {LENGTHS.map((l) => (
                                    <button
                                        key={l.key}
                                        onClick={() => {
                                            if (recallText) {
                                                // Already have content — re-generate at new length
                                                onLengthChange && onLengthChange(l.key);
                                            } else {
                                                // Idle state — just update the selected tab, don't fetch yet
                                                onLengthChange && onLengthChange(l.key, false);
                                            }
                                        }}
                                        disabled={isLoading}
                                        className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${activeLength === l.key
                                            ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-900/50'
                                            : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                                            } disabled:opacity-50`}
                                    >
                                        {l.label}
                                        <span className="text-[10px] opacity-70 mt-0.5">{l.desc}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Body */}
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            {isLoading ? (
                                <SkeletonLoader />
                            ) : error ? (
                                <div className="text-red-300 text-sm text-center py-4 flex flex-col items-center gap-3">
                                    <p>{error}</p>
                                    <button
                                        onClick={() => onGenerate && onGenerate(activeLength)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20"
                                    >
                                        <RefreshCw size={14} /> Retry
                                    </button>
                                </div>
                            ) : recallText ? (
                                <p className="text-purple-50 text-sm leading-relaxed whitespace-pre-wrap">
                                    {recallText}
                                </p>
                            ) : (
                                // Idle state — no content yet, show the generate prompt
                                !isOrientation && (
                                    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                                        <p className="text-purple-200/70 text-xs max-w-[260px]">
                                            Choose a recap length above, then tap <span className="text-white font-semibold">Get Caught Up</span> to have Atheneum remind you what's happened.
                                        </p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Footer CTA */}
                        <div className="px-6 pb-8 pt-4 flex flex-col gap-2">
                            {/* Show 'Get Caught Up' if idle; 'Resume Reading' otherwise */}
                            {!isLoading && !recallText && !error && !isOrientation ? (
                                <motion.button
                                    onClick={() => onGenerate && onGenerate(activeLength)}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative w-full py-4 rounded-2xl font-semibold text-white text-base overflow-hidden"
                                    style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <Zap size={20} />
                                        Get Caught Up
                                    </span>
                                </motion.button>
                            ) : (
                                <motion.button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative w-full py-4 rounded-2xl font-semibold text-white text-base overflow-hidden disabled:opacity-60"
                                    style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <BookOpen size={20} />
                                        Resume Reading
                                    </span>
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RecallModal;
