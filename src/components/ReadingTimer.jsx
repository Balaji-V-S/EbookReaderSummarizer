import React, { useState, useEffect } from 'react';
import { Play, Square, ArrowLeft, Save, Clock, BookOpen, List, X, Sparkles, Settings, BookMarked } from 'lucide-react';
import { updatePhysicalProgress, saveSummary } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSummary, getAISettings } from '../utils/ai';
import SummaryModal from './SummaryModal';
import SettingsModal from './SettingsModal';
import NotesModal from './NotesModal';

const ReadingTimer = ({ book, onBack }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [timeInSeconds, setTimeInSeconds] = useState(0);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newPage, setNewPage] = useState(book.currentPage || 0);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Summarization States
    const [showSummary, setShowSummary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [showChapterPrompt, setShowChapterPrompt] = useState(false);
    const [chapterInput, setChapterInput] = useState('');

    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(() => {
                setTimeInSeconds((prev) => prev + 1);
            }, 1000);
        } else if (!isRunning && timeInSeconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeInSeconds]);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStop = () => {
        if (timeInSeconds > 0) {
            setIsRunning(false);
            setShowSaveModal(true);
        }
    };

    const handleSaveSession = async () => {
        if (!newPage || parseInt(newPage) <= (book.currentPage || 0)) {
            setSaveError(`Please enter a page number greater than ${book.currentPage || 0}.`);
            return;
        }
        setSaveError('');
        setSaving(true);
        const pagesRead = parseInt(newPage) - (book.currentPage || 0);
        const durationMs = timeInSeconds * 1000;

        await updatePhysicalProgress(book.id, pagesRead, durationMs, parseInt(newPage));

        setSaving(false);
        onBack(); // Return to library after saving
    };

    // Calculate progress percentage
    const progressPercent = book.totalPages > 0
        ? Math.min(Math.round(((book.currentPage || 0) / book.totalPages) * 100), 100)
        : 0;

    const handleSummarizeClick = () => {
        const aiSettings = getAISettings();
        if (!aiSettings.apiKey) {
            setShowSettings(true);
            return;
        }
        setShowChapterPrompt(true);
    };

    const handleGenerateSummary = async () => {
        if (!chapterInput.trim()) return;

        setShowChapterPrompt(false);
        setShowSummary(true);
        setSummaryLoading(true);
        setSummaryText('');

        try {
            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: chapterInput.trim(),
                progress: (progressPercent / 100).toString(),
                previousChapters: [],
                anchors: null,
            };

            const summary = await generateSummary(metadata);
            setSummaryText(summary);
            await saveSummary(book.id, chapterInput.trim(), summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText('**API Key Issue:** Your AI API key may be invalid or restricted. Please verify your AI provider settings.');
            } else {
                setSummaryText(`Error: ${error.message}. Please check your AI settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center pt-8 px-4">

            <header className="w-full max-w-2xl flex items-center justify-between mb-6 sm:mb-12">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center truncate px-2 sm:px-4">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">{book.title}</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                    <button
                        onClick={handleSummarizeClick}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors mr-2"
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Summarize</span>
                    </button>

                    <button
                        onClick={() => setShowNotes(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors mr-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50`}
                    >
                        <BookMarked size={16} />
                        <span className="hidden sm:inline">Notes</span>
                    </button>

                    <button onClick={() => setShowSettings(true)} className="p-2 hover:opacity-70 rounded-full transition-colors text-gray-600 dark:text-gray-300">
                        <Settings size={20} />
                    </button>
                    <div className="w-2 md:w-6"></div> {/* Spacer for centering */}
                </div>
            </header>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-12 shadow-xl shadow-blue-900/5 w-full max-w-md text-center border border-gray-100 dark:border-gray-700 mx-4"
            >
                <div className="text-5xl sm:text-7xl font-mono text-gray-800 dark:text-white mb-8 sm:mb-10 tabular-nums">
                    {formatTime(timeInSeconds)}
                </div>

                <div className="flex justify-center gap-6">
                    {!isRunning ? (
                        <button
                            onClick={() => setIsRunning(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg shadow-blue-500/40 transition-transform active:scale-95"
                        >
                            <Play size={32} className="ml-2" />
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg shadow-red-500/40 transition-transform active:scale-95 animate-pulse"
                        >
                            <Square size={28} />
                        </button>
                    )}
                </div>
            </motion.div>

            <div className="w-full max-w-md mt-10">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1"><BookOpen size={16} /> Page {book.currentPage || 0}</span>
                    <span>{progressPercent}% Complete</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                </div>
            </div>

            <AnimatePresence>
                {showSaveModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Session Complete!</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
                                <Clock size={16} /> You read for {formatTime(timeInSeconds)}.
                            </p>

                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                What page did you stop on?
                            </label>
                            <input
                                type="number"
                                min={(book.currentPage || 0) + 1}
                                max={book.totalPages || 9999}
                                value={newPage}
                                onChange={(e) => {
                                    setNewPage(e.target.value);
                                    setSaveError('');
                                }}
                                className="w-full px-4 py-3 text-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white mb-2"
                            />
                            {saveError && (
                                <p className="text-sm text-red-500 dark:text-red-400 mb-4 flex items-center gap-1">
                                    <span>⚠</span> {saveError}
                                </p>
                            )}
                            {!saveError && <div className="mb-6" />}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveSession}
                                    disabled={saving || !newPage || parseInt(newPage) <= (book.currentPage || 0)}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-blue-600/30"
                                >
                                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save size={18} /> Save</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showChapterPrompt && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <Sparkles size={20} className="text-purple-500" /> AI Summary
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                To generate an accurate summary without spoilers, what chapter did you just finish reading?
                            </p>

                            <input
                                type="text"
                                placeholder="e.g. Chapter 4 or The Gathering"
                                value={chapterInput}
                                onChange={(e) => setChapterInput(e.target.value)}
                                className="w-full px-4 py-3 text-base bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none dark:text-white mb-2"
                                autoFocus
                            />

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowChapterPrompt(false)}
                                    className="flex-1 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={!chapterInput.trim() || summaryLoading}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex justify-center items-center"
                                >
                                    Generate
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                summary={summaryText}
                isLoading={summaryLoading}
            />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            <NotesModal
                isOpen={showNotes}
                onClose={() => setShowNotes(false)}
                bookId={book.id}
                bookTitle={book.title}
            />

        </div>
    );
};

export default ReadingTimer;
