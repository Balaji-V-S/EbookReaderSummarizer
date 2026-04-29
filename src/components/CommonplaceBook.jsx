import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, BookOpen, Tag, Trash2, ExternalLink, Download, BookMarked, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllEntries, deleteEntry } from '../utils/storage';

// ────────────────────────────────────────────────────────────────────────────
// Tag chip colours (deterministic from tag string)
const TAG_PALETTES = [
    'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700/50',
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
    'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/50',
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50',
    'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700/50',
];
const tagColour = (tag) => TAG_PALETTES[Math.abs([...tag].reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_PALETTES.length];

// ────────────────────────────────────────────────────────────────────────────
const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

// ────────────────────────────────────────────────────────────────────────────
const EntryCard = ({ entry, onDelete, onJump }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group relative"
        >
            {/* Accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl opacity-70" />

            <div className="pl-4 pr-4 pt-4 pb-3">
                {/* Quote */}
                <blockquote className="text-[15px] leading-relaxed italic text-gray-700 dark:text-gray-200 mb-3 border-l-0">
                    &ldquo;{entry.quote}&rdquo;
                </blockquote>

                {/* User note */}
                {entry.myNote && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 border border-amber-100 dark:border-amber-800/30">
                        {entry.myNote}
                    </p>
                )}

                {/* Tags */}
                {entry.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.tags.map(t => (
                            <span key={t} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border font-medium ${tagColour(t)}`}>
                                #{t}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{entry.bookTitle}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{entry.bookAuthor} · {formatDate(entry.timestamp)}</p>
                        {entry.chapter && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5 italic">{entry.chapter}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {entry.cfi && onJump && (
                            <button
                                onClick={() => onJump(entry)}
                                title="Jump to this passage"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                                <ExternalLink size={14} />
                            </button>
                        )}
                        {confirmDelete ? (
                            <div className="flex gap-1">
                                <button onClick={() => onDelete(entry.id)} className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-medium">Delete</button>
                                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs">Cancel</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                title="Delete entry"
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
const CommonplaceBook = ({ onBack }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedBook, setSelectedBook] = useState('all');
    const [selectedTag, setSelectedTag] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getAllEntries();
            setEntries(all);
        } catch (e) {
            console.error('Failed to load entries:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        await deleteEntry(id);
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    // Derive filter options
    const books = [...new Map(entries.map(e => [e.bookId, { id: e.bookId, title: e.bookTitle }])).values()];
    const allTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();

    // Filter
    const filtered = entries.filter(e => {
        const matchBook = selectedBook === 'all' || e.bookId === selectedBook;
        const matchTag = selectedTag === 'all' || (e.tags || []).includes(selectedTag);
        const q = search.toLowerCase();
        const matchSearch = !q || e.quote.toLowerCase().includes(q) || (e.myNote || '').toLowerCase().includes(q) || e.bookTitle.toLowerCase().includes(q) || (e.tags || []).some(t => t.includes(q));
        return matchBook && matchTag && matchSearch;
    });

    // Export as Markdown
    const handleExport = () => {
        const lines = ['# My Commonplace Book\n'];
        let lastBook = '';
        [...filtered].sort((a, b) => a.bookTitle.localeCompare(b.bookTitle)).forEach(e => {
            if (e.bookTitle !== lastBook) {
                lines.push(`\n## ${e.bookTitle}\n*${e.bookAuthor}*\n`);
                lastBook = e.bookTitle;
            }
            lines.push(`> "${e.quote}"`);
            if (e.chapter) lines.push(`*${e.chapter}*`);
            if (e.myNote) lines.push(`\n${e.myNote}`);
            if (e.tags?.length) lines.push(`\n${e.tags.map(t => `#${t}`).join(' ')}`);
            lines.push(`\n*${formatDate(e.timestamp)}*\n---\n`);
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'commonplace-book.md'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 flex flex-col bg-[#fafaf8] dark:bg-gray-900 min-h-0 overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 md:px-8 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BookMarked size={20} className="text-amber-500" />
                                Commonplace Book
                            </h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} across {books.length} {books.length === 1 ? 'book' : 'books'}
                            </p>
                        </div>
                    </div>
                    {entries.length > 0 && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Export as Markdown"
                        >
                            <Download size={14} /> Export
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search quotes, notes, tags, books…"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-400/50 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
                    {/* Book filter */}
                    {books.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <BookOpen size={13} className="text-gray-400" />
                            <select
                                value={selectedBook}
                                onChange={e => setSelectedBook(e.target.value)}
                                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                            >
                                <option value="all">All Books</option>
                                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Tag filters as chips */}
                    {allTags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Tag size={13} className="text-gray-400 flex-shrink-0" />
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setSelectedTag('all')}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex-shrink-0 ${selectedTag === 'all' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-300'}`}
                                >
                                    All
                                </button>
                                {allTags.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTag(t === selectedTag ? 'all' : t)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex-shrink-0 ${selectedTag === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-300'}`}
                                    >
                                        #{t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                    </div>
                ) : entries.length === 0 ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
                        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-5 shadow-sm">
                            <BookMarked size={36} className="text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Your Commonplace Book</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Select text while reading, then tap <strong>Save to Commonplace Book</strong> to add your first entry.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 italic">
                            &ldquo;The faintest ink is more powerful than the strongest memory.&rdquo;
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-gray-400">
                        <Filter size={32} className="mb-3 opacity-30" />
                        <p>No entries match your search or filters.</p>
                        <button onClick={() => { setSearch(''); setSelectedBook('all'); setSelectedTag('all'); }} className="mt-3 text-sm text-amber-500 hover:text-amber-600 font-medium">
                            Clear filters
                        </button>
                    </div>
                ) : (
                    /* Masonry-style 2-col grid on md+, 1-col on mobile */
                    <div className="columns-1 md:columns-2 gap-4 space-y-0">
                        <AnimatePresence>
                            {filtered.map(entry => (
                                <div key={entry.id} className="break-inside-avoid mb-4">
                                    <EntryCard
                                        entry={entry}
                                        onDelete={handleDelete}
                                        onJump={null} /* Jump handled by parent via book router */
                                    />
                                </div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommonplaceBook;
