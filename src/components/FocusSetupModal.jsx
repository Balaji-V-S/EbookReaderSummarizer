import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Headphones, Play } from 'lucide-react';

const TIMER_OPTIONS = [
    { value: 15, label: '15 min' },
    { value: 25, label: '25 min' },
    { value: 45, label: '45 min' },
    { value: 0, label: 'None' },
];

const AMBIENCE_OPTIONS = [
    { value: 'silence', label: 'Silence', emoji: '🤫' },
    { value: 'rain', label: 'Rain', emoji: '🌧️' },
    { value: 'cafe', label: 'Cafe', emoji: '☕' },
    { value: 'forest', label: 'Forest', emoji: '🌲' },
];

const FocusSetupModal = ({ isOpen, onClose, onStart }) => {
    const [timerGoal, setTimerGoal] = useState(25);
    const [ambience, setAmbience] = useState('silence');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                            <Clock size={20} className="text-blue-500" />
                            <span>Focus Session</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto min-h-0">
                        <div className="p-5 space-y-6">
                            {/* Read Goal */}
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Set a Goal</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {TIMER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTimerGoal(opt.value)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${timerGoal === opt.value
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/50'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ambience */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    <Headphones size={16} /> Background Ambience
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AMBIENCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAmbience(opt.value)}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${ambience === opt.value
                                                ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/50'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300'
                                                }`}
                                        >
                                            <span className="text-xl">{opt.emoji}</span>
                                            <span className="text-xs font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <button
                            onClick={() => onStart({ timerGoal, ambience })}
                            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <Play size={18} fill="currentColor" />
                            Start Deep Reading
                        </button>
                        <p className="text-center text-[11px] text-gray-500 mt-3 px-2">
                            Distractions hidden. System status bar suppressed. Notifications masked.
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FocusSetupModal;
