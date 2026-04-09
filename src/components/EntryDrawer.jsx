import React, { useState, useEffect, useRef } from 'react';
import { X, BookMarked, Tag, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveEntry } from '../utils/storage';

/**
 * EntryDrawer — a bottom-sheet that slides up when the reader wants to save
 * a passage to their Commonplace Book. It does NOT take over the whole screen.
 *
 * Props:
 *  isOpen      – boolean
 *  onClose     – fn
 *  quote       – pre-filled selected text
 *  book        – { id, title, author }
 *  chapter     – current chapter label
 *  cfi         – current CFI (for jump-back link)
 *  theme       – 'light' | 'dark' | 'sepia'
 */
const EntryDrawer = ({ isOpen, onClose, quote, book, chapter, cfi, theme }) => {
    const [myNote, setMyNote] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const noteRef = useRef(null);

    // Reset form each time drawer opens
    useEffect(() => {
        if (isOpen) {
            setMyNote('');
            setTagInput('');
            setTags([]);
            setSaved(false);
            setTimeout(() => noteRef.current?.focus(), 350);
        }
    }, [isOpen]);

    const addTag = (raw) => {
        const cleaned = raw.trim().toLowerCase().replace(/^#/, '');
        if (cleaned && !tags.includes(cleaned)) {
            setTags(prev => [...prev, cleaned]);
        }
        setTagInput('');
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
            setTags(prev => prev.slice(0, -1));
        }
    };

    const removeTag = (t) => setTags(prev => prev.filter(x => x !== t));

    const handleSave = async () => {
        if (!quote?.trim()) return;
        setSaving(true);
        try {
            await saveEntry({
                bookId: book.id,
                bookTitle: book.title,
                bookAuthor: book.author,
                quote: quote.trim(),
                myNote: myNote.trim(),
                tags,
                chapter: chapter || '',
                cfi: cfi || null,
            });
            setSaved(true);
            setTimeout(() => {
                onClose();
            }, 900);
        } catch (err) {
            console.error('Failed to save entry:', err);
        } finally {
            setSaving(false);
        }
    };

    const isDark = theme === 'dark';
    const isSepia = theme === 'sepia';
    const bg = isDark ? 'bg-gray-900 border-gray-700' : isSepia ? 'bg-[#f4ecd8] border-[#d6cebc]' : 'bg-white border-gray-200';
    const text = isDark ? 'text-gray-100' : isSepia ? 'text-[#5b4636]' : 'text-gray-900';
    const subtext = isDark ? 'text-gray-400' : isSepia ? 'text-[#8b7355]' : 'text-gray-500';
    const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : isSepia ? 'bg-[#ede6d3] border-[#c8bfaa] text-[#5b4636] placeholder-[#a89880]' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
    const tagBg = isDark ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        key="drawer"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                        className={`fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl border-t shadow-2xl ${bg}`}
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                    >
                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                        </div>

                        <div className="px-5 pb-5 pt-2">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BookMarked size={18} className="text-amber-500" />
                                    <span className={`font-semibold text-sm ${text}`}>Save to Commonplace Book</span>
                                </div>
                                <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                                    <X size={16} className={subtext} />
                                </button>
                            </div>

                            {/* Quote preview */}
                            {quote && (
                                <blockquote className={`text-sm italic leading-relaxed mb-4 pl-3 border-l-2 border-amber-400 ${subtext} line-clamp-3`}>
                                    "{quote.trim()}"
                                </blockquote>
                            )}

                            {/* My note */}
                            <div className="mb-3">
                                <label className={`text-xs font-medium mb-1.5 block ${subtext}`}>Your thought on this</label>
                                <textarea
                                    ref={noteRef}
                                    value={myNote}
                                    onChange={e => setMyNote(e.target.value)}
                                    placeholder="What does this mean to you? What does it remind you of?"
                                    rows={3}
                                    className={`w-full rounded-xl px-3 py-2.5 text-sm border resize-none outline-none focus:ring-2 focus:ring-amber-400/50 transition-all ${inputBg}`}
                                />
                            </div>

                            {/* Tags */}
                            <div className="mb-4">
                                <label className={`text-xs font-medium mb-1.5 block flex items-center gap-1 ${subtext}`}>
                                    <Tag size={11} /> Tags
                                </label>
                                <div className={`flex flex-wrap gap-1.5 items-center p-2 rounded-xl border min-h-[40px] ${inputBg}`}>
                                    {tags.map(t => (
                                        <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${tagBg}`}>
                                            #{t}
                                            <button onClick={() => removeTag(t)} className="opacity-70 hover:opacity-100 ml-0.5">
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        onBlur={() => tagInput.trim() && addTag(tagInput)}
                                        placeholder={tags.length === 0 ? 'philosophy, stoicism… (Enter to add)' : ''}
                                        className={`flex-1 min-w-[120px] outline-none text-xs bg-transparent ${isDark ? 'placeholder-gray-600' : 'placeholder-gray-400'}`}
                                    />
                                </div>
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving || saved || !quote?.trim()}
                                className={`w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${saved
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                                    } disabled:opacity-60`}
                            >
                                {saved ? <><Check size={18} /> Saved!</> : saving ? 'Saving…' : <><Save size={16} /> Save to Commonplace Book</>}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EntryDrawer;
