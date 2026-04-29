import React from 'react';
import { Highlighter, Sparkles, BookOpen, X, BookMarked } from 'lucide-react';

const SelectionMenu = ({
    selection,
    showDictionary,
    handleHighlight,
    handleSaveToCommonplace,
    handleExplain,
    handleDictionary,
    clearSelection
}) => {
    if (!selection || showDictionary) return null;

    return (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-5 max-w-[95vw] overflow-x-auto hide-scrollbar">
            <button onClick={handleHighlight} className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity flex-shrink-0">
                <Highlighter size={17} />
                <span className="hidden xs:inline">Highlight</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <button onClick={handleSaveToCommonplace} className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:opacity-80 transition-opacity flex-shrink-0">
                <BookMarked size={17} />
                <span className="hidden xs:inline">Save</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <button onClick={handleExplain} className="flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:opacity-80 transition-opacity flex-shrink-0">
                <Sparkles size={17} />
                <span className="hidden xs:inline">Explain</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <button onClick={handleDictionary} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex-shrink-0">
                <BookOpen size={17} />
                <span className="hidden xs:inline">Define</span>
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
            <button onClick={clearSelection} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0">
                <X size={17} />
            </button>
        </div>
    );
};

export default SelectionMenu;

