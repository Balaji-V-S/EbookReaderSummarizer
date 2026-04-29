import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, BookmarkPlus, Check, RefreshCw, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SkeletonLoader = ({ lines = 4 }) => (
    <div className="space-y-2.5 animate-pulse">
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className="h-3.5 rounded-full bg-current opacity-10"
                style={{ width: `${[100, 88, 94, 72, 85][i % 5]}%` }}
            />
        ))}
    </div>
);

/**
 * ExplainModal — slides up from the bottom when the user selects text and taps "Explain".
 * Shows a contextual AI explanation and a follow-up chat input.
 *
 * Props:
 *  isOpen          {bool}
 *  onClose         {fn}
 *  selectedText    {string}    — the highlighted passage
 *  explanation     {string}    — the AI's explanation text
 *  isLoading       {bool}
 *  error           {string|null}
 *  onRetry         {fn}
 *  onSave          {fn}        — saves explanation as a highlight+note
 *  isSaved         {bool}
 *  onFollowUp      {fn(question)}  — sends follow-up question, returns promise
 *  theme           {string}    — 'light' | 'dark' | 'sepia'
 */
const ExplainModal = ({
    isOpen,
    onClose,
    selectedText,
    explanation,
    isLoading,
    error,
    onRetry,
    onSave,
    isSaved,
    onFollowUp,
    theme = 'light',
}) => {
    const [followUpInput, setFollowUpInput] = useState('');
    const [followUps, setFollowUps] = useState([]); // [{ q, a, loading }]
    const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Reset follow-ups when the selection changes
    useEffect(() => {
        setFollowUps([]);
        setFollowUpInput('');
    }, [selectedText]);

    // Autoscroll to bottom when new content arrives
    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [followUps, explanation]);

    const handleSendFollowUp = async () => {
        const q = followUpInput.trim();
        if (!q || isFollowUpLoading) return;

        setFollowUpInput('');
        setIsFollowUpLoading(true);
        setFollowUps(prev => [...prev, { q, a: '', loading: true }]);

        try {
            const answer = await onFollowUp(q);
            setFollowUps(prev => prev.map((f, i) =>
                i === prev.length - 1 ? { ...f, a: answer, loading: false } : f
            ));
        } catch (err) {
            setFollowUps(prev => prev.map((f, i) =>
                i === prev.length - 1 ? { ...f, a: `Error: ${err.message}`, loading: false } : f
            ));
        } finally {
            setIsFollowUpLoading(false);
        }
    };

    // Theme colours
    const bg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : theme === 'sepia' ? 'bg-[#f4ecd8] border-[#e3dccb]' : 'bg-white border-gray-200';
    const text = theme === 'dark' ? 'text-gray-100' : theme === 'sepia' ? 'text-[#5b4636]' : 'text-gray-800';
    const subtext = theme === 'dark' ? 'text-gray-400' : theme === 'sepia' ? 'text-[#8b7355]' : 'text-gray-500';
    const inputBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : theme === 'sepia' ? 'bg-[#ede6d0] border-[#d6cebc] text-[#5b4636] placeholder-[#a09080]' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400';
    const chipBg = theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : theme === 'sepia' ? 'bg-amber-100 text-amber-800' : 'bg-purple-50 text-purple-700';
    const bubbleBg = theme === 'dark' ? 'bg-gray-800' : theme === 'sepia' ? 'bg-[#ede6d0]' : 'bg-gray-100';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="explain-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[80] flex items-end justify-center"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                    onClick={onClose}
                >
                    <motion.div
                        key="explain-panel"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full max-w-2xl rounded-t-3xl shadow-2xl border-t flex flex-col overflow-hidden ${bg}`}
                        style={{ maxHeight: '85vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle + Header */}
                        <div className={`flex-shrink-0 px-5 pt-4 pb-3 border-b ${theme === 'dark' ? 'border-gray-800' : theme === 'sepia' ? 'border-[#e3dccb]' : 'border-gray-100'}`}>
                            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-purple-500" />
                                    <span className={`font-semibold text-sm ${text}`}>AI Explain</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {explanation && (
                                        <button
                                            onClick={onSave}
                                            title={isSaved ? 'Saved!' : 'Save explanation as a note'}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSaved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'}`}
                                        >
                                            {isSaved ? <Check size={13} /> : <BookmarkPlus size={13} />}
                                            {isSaved ? 'Saved' : 'Save'}
                                        </button>
                                    )}
                                    <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${subtext}`}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Selected text chip */}
                            {selectedText && (
                                <div className={`mt-3 px-3 py-2 rounded-xl text-xs italic leading-relaxed line-clamp-2 ${chipBg}`}>
                                    "{selectedText}"
                                </div>
                            )}
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {/* Main explanation */}
                            {isLoading ? (
                                <SkeletonLoader lines={5} />
                            ) : error ? (
                                <div className={`text-sm ${subtext} flex flex-col items-center gap-3 py-4 text-center`}>
                                    <p>{error}</p>
                                    <button onClick={onRetry} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs hover:opacity-80">
                                        <RefreshCw size={13} /> Retry
                                    </button>
                                </div>
                            ) : explanation ? (
                                <div className={`text-sm leading-relaxed ${text}`}>
                                    {explanation}
                                </div>
                            ) : null}

                            {/* Follow-up thread */}
                            {followUps.map((f, i) => (
                                <div key={i} className="space-y-2">
                                    {/* User bubble */}
                                    <div className="flex justify-end">
                                        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-purple-600 text-white text-sm">
                                            {f.q}
                                        </div>
                                    </div>
                                    {/* AI bubble */}
                                    <div className="flex justify-start">
                                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-sm text-sm ${bubbleBg} ${text}`}>
                                            {f.loading ? <SkeletonLoader lines={3} /> : f.a}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Follow-up input */}
                        {explanation && !isLoading && (
                            <div className={`flex-shrink-0 px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-800' : theme === 'sepia' ? 'border-[#e3dccb]' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={followUpInput}
                                        onChange={(e) => setFollowUpInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendFollowUp(); }}
                                        placeholder="Ask a follow-up question…"
                                        className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30 transition-all ${inputBg}`}
                                        disabled={isFollowUpLoading}
                                    />
                                    <button
                                        onClick={handleSendFollowUp}
                                        disabled={!followUpInput.trim() || isFollowUpLoading}
                                        className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-all flex-shrink-0"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ExplainModal;
