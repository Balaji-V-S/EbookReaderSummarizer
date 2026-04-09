import React, { useState, useEffect, useRef } from 'react';
import 'foliate-js/view.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useReader } from './Reader/useReader';

import SummaryModal from './SummaryModal';
import RecallModal from './RecallModal';
import ExplainModal from './ExplainModal';
import SettingsModal from './SettingsModal';
import DictionaryModal from './DictionaryModal';
import NotesModal from './NotesModal';
import FocusSetupModal from './FocusSetupModal';
import EntryDrawer from './EntryDrawer';
import ReaderHeader from './Reader/ReaderHeader';
import AppearanceMenu from './Reader/AppearanceMenu';
import TocSidebar from './Reader/TocSidebar';
import ReaderFooter from './Reader/ReaderFooter';
import SelectionMenu from './Reader/SelectionMenu';
import { getHighlights, saveHighlight, deleteHighlight } from '../utils/storage';

const Reader = ({ book, onBack }) => {
    const readerState = useReader({ book, onBack });

    const {
        viewerRef, location, isReady, showSummary, setShowSummary, showSettings, setShowSettings,
        showAppearance, setShowAppearance, showToc, setShowToc, showNotes, setShowNotes, showControls, setShowControls,
        toc, summaryLoading, summaryText, loadError,
        showRecall, setShowRecall, recallText, recallLoading, recallError, recallLength, setRecallLength, isOrientation,
        selection, showDictionary, setShowDictionary, clearSelection,
        showExplain, setShowExplain, explainText, explainLoading, explainError, explainSaved,
        showFocusSetup, setShowFocusSetup, isFocusMode, showFocusExit, focusGoal, focusTimeRemaining, showFocusCelebration,
        settings, update, theme, fontSize, fontFamily, lineHeight, maxWidth, flow,
        handleRecall, handleBack, handlePrev, handleNext, handleSummarize, handleHighlight, handleDictionary,
        handleExplain, handleExplainSave, handleExplainFollowUp, handleStartFocus, handleExitFocus,
        showGenrePicker, setShowGenrePicker, handleGenreConfirmed,
    } = readerState;

    const [bookmarks, setBookmarks] = useState([]);
    const [showToolbarHint, setShowToolbarHint] = useState(false);
    const [showEntryDrawer, setShowEntryDrawer] = useState(false);
    const toolbarHintShown = useRef(false);

    const handleSaveToCommonplace = () => {
        if (!selection?.word) return;
        setShowEntryDrawer(true);
    };

    useEffect(() => {
        if (book?.id) {
            getHighlights(book.id).then(h => {
                setBookmarks(h.filter(x => !x.note));
            });
        }
    }, [book?.id, showToc]);

    useEffect(() => {
        if (isReady && !toolbarHintShown.current && !localStorage.getItem('reader_toolbar_hint_seen')) {
            toolbarHintShown.current = true;
            const t = setTimeout(() => {
                setShowToolbarHint(true);
                setTimeout(() => {
                    setShowToolbarHint(false);
                    localStorage.setItem('reader_toolbar_hint_seen', '1');
                }, 3500);
            }, 1800);
            return () => clearTimeout(t);
        }
    }, [isReady]);

    const currentCfi = location?.start?.cfi;
    const isBookmarked = currentCfi && bookmarks.some(b => b.cfiRange === currentCfi);

    const handleToggleBookmark = async () => {
        if (!currentCfi) return;

        if (isBookmarked) {
            await deleteHighlight(book.id, currentCfi);
            setBookmarks(prev => prev.filter(b => b.cfiRange !== currentCfi));
        } else {
            const label = location?.start?.tocItem?.label || `Page ${location?.start?.displayed?.page || 'Unknown'}`;
            await saveHighlight(book.id, currentCfi, label, 'gray', '');
            setBookmarks(prev => [...prev, { cfiRange: currentCfi, text: label, color: 'gray', note: '', timestamp: Date.now() }]);
        }
    };

    return (
        <div className={`flex-1 w-full flex flex-col relative overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-gray-900'}`}>
            <ReaderHeader
                theme={theme}
                showControls={showControls}
                isFocusMode={isFocusMode}
                handleBack={handleBack}
                bookTitle={book.title}
                handleSummarize={handleSummarize}
                onRecallClick={() => setShowRecall(true)}
                setShowNotes={setShowNotes}
                setShowFocusSetup={setShowFocusSetup}
                showToc={showToc}
                setShowToc={setShowToc}
                showAppearance={showAppearance}
                setShowAppearance={setShowAppearance}
                setShowSettings={setShowSettings}
                isBookmarked={isBookmarked}
                onToggleBookmark={handleToggleBookmark}
            />

            {/* ReaderTour removed — contextual hint below replaces it */}

            <AppearanceMenu
                showAppearance={showAppearance}
                setShowAppearance={setShowAppearance}
                theme={theme}
                update={update}
                fontSize={fontSize}
                fontFamily={fontFamily}
                maxWidth={maxWidth}
                lineHeight={lineHeight}
                flow={flow}
            />

            <div className={`absolute bottom-0 left-0 right-0 ios-pwa-reader ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-50'}`} style={{ top: 'var(--safe-pt)' }}>
                {loadError && (
                    <div className="absolute inset-x-4 top-20 z-[100] bg-red-100 dark:bg-red-900/50 rounded-xl p-4 text-red-900 dark:text-red-100 flex flex-col items-center justify-center text-center shadow-lg border border-red-200 dark:border-red-800">
                        <span className="font-bold text-lg mb-2">⚠ Error Loading Book</span>
                        <p className="text-sm font-mono break-all max-w-[90%]">{loadError}</p>
                        <button onClick={onBack} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg">
                            Go Back
                        </button>
                    </div>
                )}

                <foliate-view
                    key={`viewer-${book.id}-${book.openedAt || ''}`}
                    ref={viewerRef}
                    className={`absolute inset-0 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}
                    style={{ outline: 'none' }}
                />

                {flow === 'paginated' && (
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        {/* Left nav zone — tap only, does NOT intercept drags/selection */}
                        <div
                            className="absolute inset-y-0 left-0 w-16 pointer-events-auto"
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onPointerDown={(e) => {
                                e.currentTarget._tapStart = { x: e.clientX, y: e.clientY, t: Date.now() };
                            }}
                            onPointerUp={(e) => {
                                const s = e.currentTarget._tapStart;
                                if (!s) return;
                                const dx = Math.abs(e.clientX - s.x);
                                const dy = Math.abs(e.clientY - s.y);
                                const dt = Date.now() - s.t;
                                // Only navigate on a clean short tap — ignore drags (for text selection)
                                if (dt < 300 && dx < 10 && dy < 10) {
                                    e.stopPropagation();
                                    handlePrev();
                                }
                            }}
                        />
                        {/* Right nav zone */}
                        <div
                            className="absolute inset-y-0 right-0 w-16 pointer-events-auto"
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onPointerDown={(e) => {
                                e.currentTarget._tapStart = { x: e.clientX, y: e.clientY, t: Date.now() };
                            }}
                            onPointerUp={(e) => {
                                const s = e.currentTarget._tapStart;
                                if (!s) return;
                                const dx = Math.abs(e.clientX - s.x);
                                const dy = Math.abs(e.clientY - s.y);
                                const dt = Date.now() - s.t;
                                if (dt < 300 && dx < 10 && dy < 10) {
                                    e.stopPropagation();
                                    handleNext();
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            <TocSidebar
                showToc={showToc}
                setShowToc={setShowToc}
                theme={theme}
                toc={toc}
                onNavigate={async (href) => {
                    const v = viewerRef.current;
                    if (!v) return;

                    if (href === 'next') {
                        v.next();
                        return;
                    }
                    if (href === 'prev') {
                        v.prev();
                        return;
                    }

                    try {
                        await new Promise(r => setTimeout(r, 100));
                        await viewerRef.current.goTo(href);
                    } catch (err) {
                        if (typeof href === 'string' && href.includes('#')) {
                            try {
                                const base = href.split('#')[0];
                                await viewerRef.current.goTo(base);
                            } catch (fallbackErr) {
                            }
                        }
                    }
                }}
                bookTitle={book.title}
                bookId={book.id}
                location={location}
                viewerRef={viewerRef}
            />

            <ReaderFooter
                showControls={showControls}
                isFocusMode={isFocusMode}
                theme={theme}
                location={location}
                toc={toc}
                onMenuClick={() => setShowToc(true)}
                onNavigate={async (href) => {
                    const v = viewerRef.current;
                    if (!v) return;
                    if (href === 'next') { v.next(); return; }
                    if (href === 'prev') { v.prev(); return; }
                    try {
                        await new Promise(r => setTimeout(r, 60));
                        await v.goTo(href);
                    } catch (e) {
                    }
                }}
            />

            <AnimatePresence>
                {showToolbarHint && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-black/80 backdrop-blur-md text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 pointer-events-none"
                    >
                        <span>👆</span>
                        <span>Tap the page to show or hide the toolbar</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <RecallModal
                isOpen={showRecall}
                onClose={() => setShowRecall(false)}
                onGenerate={(len) => handleRecall(len)}
                recallText={recallText}
                isLoading={recallLoading}
                isOrientation={isOrientation}
                activeLength={recallLength}
                onLengthChange={(len, shouldFetch = true) => {
                    setRecallLength(len);
                    if (shouldFetch) handleRecall(len);
                }}
                error={recallError}
            />

            <FocusSetupModal isOpen={showFocusSetup} onClose={() => setShowFocusSetup(false)} onStart={handleStartFocus} />

            <AnimatePresence>
                {isFocusMode && showFocusExit && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                        {focusGoal > 0 && (
                            <div className="bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl tracking-wider">
                                {Math.floor(focusTimeRemaining / 60)}:{String(focusTimeRemaining % 60).padStart(2, '0')} REMAINING
                            </div>
                        )}
                        <button onClick={handleExitFocus} className="bg-red-500/90 hover:bg-red-600 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2 border border-red-400/30">
                            <X size={20} /> Exit Focus
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFocusCelebration && (
                    <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 20, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-safe left-1/2 -translate-x-1/2 z-[100] mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px]">
                        <Sparkles size={28} className="text-emerald-100 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-base leading-tight">Session Complete!</p>
                            <p className="text-xs text-emerald-50 mt-0.5">You crushed your {focusGoal}-minute goal.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGenrePicker && (
                    <motion.div
                        key="genre-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 16 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-700 shadow-2xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <p className="text-center text-white font-bold text-lg mb-1">One quick thing ✨</p>
                            <p className="text-center text-gray-400 text-sm mb-6">What kind of book is <span className="text-white font-medium">{book.title}</span>? This helps tailor your summaries.</p>
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => handleGenreConfirmed('fiction')}
                                    className="flex-1 py-4 rounded-2xl bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 font-medium hover:bg-indigo-900/60 transition-colors flex flex-col items-center gap-2 active:scale-95"
                                >
                                    <span className="text-2xl">📖</span>
                                    <span>Fiction</span>
                                    <span className="text-xs opacity-60">Story, characters, plot</span>
                                </button>
                                <button
                                    onClick={() => handleGenreConfirmed('nonfiction')}
                                    className="flex-1 py-4 rounded-2xl bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 font-medium hover:bg-emerald-900/60 transition-colors flex flex-col items-center gap-2 active:scale-95"
                                >
                                    <span className="text-2xl">💡</span>
                                    <span>Non-Fiction</span>
                                    <span className="text-xs opacity-60">Ideas, facts, knowledge</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowGenrePicker(false)}
                                className="w-full py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} summary={summaryText} isLoading={summaryLoading} />
            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            <NotesModal
                isOpen={showNotes}
                onClose={() => setShowNotes(false)}
                bookId={book.id}
                bookTitle={book.title}
                onDeleteHighlight={(cfiRange) => {
                    if (viewerRef.current) {
                        try { viewerRef.current.deleteAnnotation({ value: cfiRange }); } catch (e) { }
                    }
                }}
                onClickHighlight={(cfiRange) => {
                    setShowNotes(false);
                    if (viewerRef.current) {
                        setTimeout(() => {
                            try { viewerRef.current.goTo(cfiRange); } catch (e) { }
                        }, 100);
                    }
                }}
            />

            <ExplainModal
                isOpen={showExplain}
                onClose={() => setShowExplain(false)}
                selectedText={readerState.selection?.word}
                explanation={explainText}
                isLoading={explainLoading}
                error={explainError}
                onRetry={() => handleExplain()}
                onSave={handleExplainSave}
                isSaved={explainSaved}
                onFollowUp={handleExplainFollowUp}
                theme={theme}
            />

            <DictionaryModal isOpen={showDictionary} onClose={() => { setShowDictionary(false); clearSelection(); }} word={selection?.word} />

            <SelectionMenu
                selection={selection}
                showDictionary={showDictionary}
                handleHighlight={handleHighlight}
                handleSaveToCommonplace={handleSaveToCommonplace}
                handleExplain={handleExplain}
                handleDictionary={handleDictionary}
                clearSelection={clearSelection}
            />

            <EntryDrawer
                isOpen={showEntryDrawer}
                onClose={() => { setShowEntryDrawer(false); clearSelection(); }}
                quote={selection?.word}
                book={book}
                chapter={location?.start?.tocItem?.label || ''}
                cfi={location?.start?.cfi || null}
                theme={theme}
            />
        </div>
    );
};

export default Reader;
