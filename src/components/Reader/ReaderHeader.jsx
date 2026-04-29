import React from 'react';
import { ArrowLeft, Sparkles, Clock, BookMarked, Bookmark, BookmarkPlus, Focus, List, Type } from 'lucide-react';

const ReaderHeader = ({
    theme,
    showControls,
    isFocusMode,
    handleBack,
    bookTitle,
    handleSummarize,
    onRecallClick,
    setShowNotes,
    setShowFocusSetup,
    showToc,
    setShowToc,
    showAppearance,
    setShowAppearance,
    setShowSettings,
    isBookmarked,
    onToggleBookmark
}) => {
    return (
        <header
            className={`absolute top-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 pb-2 sm:pb-3 border-b z-50 shadow-sm backdrop-blur-sm transition-all duration-300 ${showControls && !isFocusMode ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
                } ${theme === 'dark' ? 'border-gray-800 bg-gray-900/95' :
                    theme === 'sepia' ? 'border-[#e3dccb] bg-[#f4ecd8]/95' :
                        'border-gray-200 bg-white/95'
                }`}
            style={{ paddingTop: 'var(--safe-pt)' }}
        >
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={handleBack} className="p-2 hover:opacity-70 rounded-full transition-colors flex-shrink-0">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-medium truncate max-w-[100px] sm:max-w-[150px] md:max-w-md text-xs sm:text-base">
                    {bookTitle}
                </h1>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
                <button
                    id="tour-summarize"
                    onClick={handleSummarize}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors mr-0.5 sm:mr-1 ${theme === 'dark' ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' :
                        'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                >
                    <Sparkles size={16} />
                    <span className="hidden sm:inline">Summarize</span>
                </button>

                <button
                    id="tour-recall"
                    onClick={onRecallClick}
                    title="Recall — get caught up on what's happened so far"
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors mr-0.5 sm:mr-2 ${theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' :
                        'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                >
                    <Clock size={16} />
                    <span className="hidden sm:inline">Recall</span>
                </button>

                <button
                    onClick={onToggleBookmark}
                    title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors mr-0.5 sm:mr-2 ${isBookmarked
                        ? (theme === 'dark' ? 'bg-pink-900/50 text-pink-300 hover:bg-pink-900/70' : 'bg-pink-100 text-pink-700 hover:bg-pink-200')
                        : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600')
                        }`}
                >
                    {isBookmarked ? <Bookmark size={16} fill="currentColor" /> : <BookmarkPlus size={16} />}
                </button>

                <button
                    id="tour-notes"
                    onClick={() => setShowNotes(true)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors mr-0.5 sm:mr-2 ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50' :
                        'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                >
                    <BookMarked size={16} />
                    <span className="hidden sm:inline">Notes</span>
                </button>

                <button
                    id="tour-focus"
                    onClick={() => setShowFocusSetup(true)}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors mr-0.5 sm:mr-2 ${theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50' :
                        'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                    title="Focus Mode"
                >
                    <Focus size={16} />
                    <span className="hidden sm:inline">Focus</span>
                </button>

                <div className={`h-6 w-px mx-1 hidden md:block ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>



                <button
                    onClick={() => setShowAppearance(!showAppearance)}
                    className={`p-2 rounded-full flex-shrink-0 transition-colors ${showAppearance ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="Appearance Settings"
                >
                    <Type size={20} />
                </button>
            </div>
        </header>
    );
};

export default ReaderHeader;
