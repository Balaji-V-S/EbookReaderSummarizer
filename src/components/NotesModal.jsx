import React, { useEffect, useState } from 'react';
import { X, Trash2, Edit3, AlignLeft, BookMarked, MessageSquare, Sparkles } from 'lucide-react';
import { getHighlights, deleteHighlight, getSummaries, deleteSummary } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';


const NotesModal = ({ isOpen, onClose, bookId, bookTitle, onDeleteHighlight, onClickHighlight }) => {
    const [activeTab, setActiveTab] = useState('highlights'); // 'highlights' | 'summaries'
    const [highlights, setHighlights] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const h = await getHighlights(bookId);
            setHighlights(h.sort((a, b) => b.timestamp - a.timestamp));

            const s = await getSummaries(bookId);
            setSummaries(s.sort((a, b) => b.timestamp - a.timestamp));
        } catch (e) {
            console.error('Failed to load notes', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && bookId) {
            loadNotes();
        }
    }, [isOpen, bookId]);


    const handleDeleteHighlight = async (cfiRange) => {
        if (!window.confirm('Delete this highlight?')) return;
        await deleteHighlight(bookId, cfiRange);
        await loadNotes();
        if (onDeleteHighlight) {
            onDeleteHighlight(cfiRange);
        }
    };

    const handleDeleteSummary = async (timestamp) => {
        if (!window.confirm('Delete this summary?')) return;
        await deleteSummary(bookId, timestamp);
        await loadNotes();
    };

    const handleDeletePrediction = async (timestamp) => {
        if (!window.confirm('Delete this prediction?')) return;
        await deletePrediction(bookId, timestamp);
        await loadNotes();
    };

    const formatDate = (ts) => {
        return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };


    const regularHighlights = highlights.filter(h => !h.note);

    if (!isOpen) return null;

    const TABS = [
        { key: 'highlights', label: 'Highlights', count: regularHighlights.length, icon: <Edit3 size={16} />, activeColor: 'border-yellow-500 text-yellow-600 dark:text-yellow-400' },
        { key: 'summaries', label: 'Summaries', count: summaries.length, icon: <AlignLeft size={16} />, activeColor: 'border-blue-500 text-blue-600 dark:text-blue-400' },
    ];


    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col min-h-0 overflow-hidden border border-gray-100 dark:border-gray-700"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                            <BookMarked className="text-blue-500" size={24} />
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Notes & Highlights</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-xs">{bookTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex-shrink-0 flex border-b border-gray-100 dark:border-gray-700 px-4 pt-2 pb-px gap-2 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto hide-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${activeTab === tab.key
                                    ? tab.activeColor
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>

                        ) : activeTab === 'highlights' ? (
                            /* ── Regular Highlights ─────────────────────────────── */
                            <div className="space-y-4">
                                {regularHighlights.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                        <Edit3 size={32} className="mb-3 opacity-20" />
                                        <p>No highlights yet.</p>
                                        <p className="text-sm mt-1 opacity-70">Select text while reading to add one.</p>
                                    </div>
                                ) : (
                                    regularHighlights.map((h, i) => (
                                        <div
                                            key={i}
                                            onClick={() => h.cfiRange && onClickHighlight && onClickHighlight(h.cfiRange)}
                                            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                        >
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(h.cfiRange); }}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                    title="Delete Highlight"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="pr-10">
                                                <div className="w-1 h-full absolute left-0 top-0 bottom-0 bg-yellow-400 rounded-l-xl opacity-50"></div>
                                                <blockquote className="pl-3 py-1 border-l-2 border-yellow-200 dark:border-yellow-700 text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed italic mb-3">
                                                    "{h.text}"
                                                </blockquote>
                                                <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 pl-3">
                                                    <span>{formatDate(h.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                        ) : (
                            /* ── Summaries ───────────────────────────────────────── */

                            <div className="space-y-4">
                                {summaries.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                        <AlignLeft size={32} className="mb-3 opacity-20" />
                                        <p>No summaries generated.</p>
                                        <p className="text-sm mt-1 opacity-70">Use the Sparkles icon to summarize chapters.</p>
                                    </div>
                                ) : (
                                    summaries.map((s, i) => (
                                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-blue-100 dark:border-blue-900/30 group relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                                                    <MessageSquare size={16} />
                                                    <span className="truncate max-w-[200px] sm:max-w-sm">{s.chapterName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(s.timestamp)}</span>
                                                    <button
                                                        onClick={() => handleDeleteSummary(s.timestamp)}
                                                        className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Delete Summary"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                                                <ReactMarkdown>{s.text}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default NotesModal;
