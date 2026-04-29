import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, ArrowLeft } from 'lucide-react';

/**
 * ReflectionCard — intercepts the back-button exit when there's an open prediction.
 * Surfaces the earlier prediction and asks how it went.
 *
 * Props:
 *  isOpen          {bool}
 *  prediction      {{ text, genre, timestamp }}
 *  bookTitle       {string}   — shown for context
 *  onOutcome       {fn(outcome)}  — called with 'yes' | 'partly' | 'no' | 'noyet'
 *  onSkip          {fn}           — exits without recording outcome
 *  onKeepReading   {fn}           — cancels exit, returns to book
 */
const ReflectionCard = ({ isOpen, prediction, bookTitle, onOutcome, onSkip, onKeepReading }) => {
    if (!prediction) return null;

    const isFiction = prediction.genre === 'fiction';

    const outcomes = isFiction
        ? [
            { key: 'yes', emoji: '✅', label: 'Yes!', sub: 'Nailed it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Close enough' },
            { key: 'no', emoji: '❌', label: 'Nope', sub: 'Surprised me' },
        ]
        : [
            { key: 'yes', emoji: '✅', label: 'Yes!', sub: 'Learned it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Still processing' },
            { key: 'noyet', emoji: '📖', label: 'Not yet', sub: 'Still reading' },
        ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="reflection-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[95] flex items-center justify-center p-6"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                // Intentionally no onClick on backdrop — don't accidentally dismiss
                >
                    <motion.div
                        key="reflection-card"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-700 shadow-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Context header — explains why this appeared */}
                        <div className="flex items-center gap-2 mb-5">
                            <button
                                onClick={onKeepReading}
                                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                                title="Keep Reading"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Before you go…</p>
                                {bookTitle && (
                                    <p className="text-white text-sm font-semibold truncate max-w-[220px]">{bookTitle}</p>
                                )}
                            </div>
                        </div>

                        {/* Header icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isFiction ? 'bg-indigo-900/50' : 'bg-emerald-900/50'}`}>
                            {isFiction
                                ? <BookOpen size={22} className="text-indigo-400" />
                                : <Lightbulb size={22} className="text-emerald-400" />
                            }
                        </div>

                        <p className="text-center text-white font-bold text-lg mb-1">
                            {isFiction ? 'Were you right?' : 'Did you find it?'}
                        </p>
                        <p className="text-center text-gray-500 text-xs mb-4">You made a prediction at the start of this session.</p>

                        {/* Earlier prediction */}
                        <div className="my-4 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700">
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                                {isFiction ? 'Your prediction' : 'Your intention'}
                            </p>
                            <p className="text-gray-200 text-sm leading-relaxed italic">"{prediction.text}"</p>
                        </div>

                        {/* Outcome buttons */}
                        <div className="flex gap-2 mb-4">
                            {outcomes.map(o => (
                                <button
                                    key={o.key}
                                    onClick={() => onOutcome(o.key)}
                                    className="flex-1 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex flex-col items-center gap-1 active:scale-95"
                                >
                                    <span className="text-xl">{o.emoji}</span>
                                    <span className="text-white text-xs font-semibold">{o.label}</span>
                                    <span className="text-gray-500 text-[10px]">{o.sub}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onKeepReading}
                                className="flex-1 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors font-medium"
                            >
                                ← Keep Reading
                            </button>
                            <button
                                onClick={onSkip}
                                className="flex-1 py-2.5 text-sm text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Skip & exit
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReflectionCard;
