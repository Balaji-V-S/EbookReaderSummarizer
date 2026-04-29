import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getHighlights, getSummaries } from '../../utils/storage';

const TocSidebar = ({ showToc, setShowToc, theme, toc, onNavigate, bookTitle, bookId, location, viewerRef }) => {
    const [activeTab, setActiveTab] = useState('Chapters');
    const [bookmarks, setBookmarks] = useState([]);
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        if (showToc && bookId) {
            getHighlights(bookId).then(h => {
                setBookmarks(h.filter(x => !x.note).sort((a, b) => b.timestamp - a.timestamp));
                setNotes(h.filter(x => x.note).sort((a, b) => b.timestamp - a.timestamp));
            });
        }
    }, [showToc, bookId]);

    if (!showToc) return null;

    const currentTocIndex = toc.findIndex(item =>
        location?.start?.tocItem?.href === item.href || location?.start?.tocItem?.label === item.label
    );

    const isCurrentItem = (item) => {
        return location?.start?.tocItem?.href === item.href || location?.start?.tocItem?.label === item.label;
    };

    const TABS = ['Chapters', 'Bookmarks'];

    const renderTocItem = (item, depth = 0) => {
        const isCurrent = isCurrentItem(item);

        return (
            <React.Fragment key={item.href || item.label}>
                <li>
                    <button
                        onClick={() => {
                            if (item.href) {
                                onNavigate(item.href);
                                setShowToc(false);
                            }
                        }}
                        className={`w-full text-left py-3 flex items-start gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group ${depth === 0 ? 'px-6' : 'pr-6'}`}
                        style={{ paddingLeft: depth > 0 ? `${1.5 + (depth * 1.5)}rem` : undefined }}
                    >
                        <div className="pt-1 w-3 shrink-0 flex justify-center">
                            {isCurrent && (
                                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-pink-400' : 'bg-pink-500'}`} />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className={`text-base font-medium leading-tight ${isCurrent ? (theme === 'dark' ? 'text-pink-300' : 'text-pink-600') : ''
                                } ${depth > 0 ? 'text-sm opacity-90' : ''}`}>
                                {item.label}
                            </div>
                            {isCurrent && (
                                <div className={`text-xs mt-1 opacity-60 ${theme === 'dark' ? 'text-pink-300/80' : 'text-pink-600/80'}`}>
                                    currently viewing
                                </div>
                            )}
                        </div>
                    </button>
                </li>
                {item.subitems && item.subitems.length > 0 && (
                    item.subitems.map(subitem => renderTocItem(subitem, depth + 1))
                )}
            </React.Fragment>
        );
    };

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col transform transition-transform duration-300 ${theme === 'dark' ? 'bg-[#1a141a] text-gray-200' :
            theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' :
                'bg-white text-gray-900'
            }`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pb-4 w-full" style={{ paddingTop: 'var(--safe-pt)' }}>
                <button
                    onClick={() => setShowToc(false)}
                    className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-xl font-medium truncate flex-1">{bookTitle || 'Table of Contents'}</h2>
            </div>

            {/* Tabs */}
            <div className={`flex items-center px-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} shrink-0`}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${isActive
                                ? (theme === 'dark' ? 'text-pink-300' : 'text-pink-600')
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab}
                            {isActive && (
                                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-0.5 rounded-t-full ${theme === 'dark' ? 'bg-pink-300' : 'bg-pink-600'
                                    }`} />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto w-full">
                {activeTab === 'Chapters' && (
                    <div className="py-2">
                        {toc.length > 0 ? (
                            <ul className="flex flex-col">
                                {toc.map((item) => renderTocItem(item, 0))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-sm opacity-60 italic">
                                No chapters found in this book.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Bookmarks' && (
                    <div className="py-2 px-4">
                        {bookmarks.length > 0 ? (
                            <div className="space-y-4">
                                {bookmarks.map((b, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800/50 dark:border-gray-800 cursor-pointer" onClick={() => {
                                        if (viewerRef?.current) {
                                            viewerRef.current.goTo(b.cfiRange);
                                            setShowToc(false);
                                        }
                                    }}>
                                        <blockquote className="border-l-2 border-yellow-400 pl-3 text-sm italic opacity-80 line-clamp-3">"{b.text}"</blockquote>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-sm opacity-60 italic">No bookmarks yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TocSidebar;
