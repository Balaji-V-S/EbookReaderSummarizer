import React, { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { updateProgress, saveEbookSession } from '../utils/storage';
import { generateSummary, getAISettings, PROVIDERS } from '../utils/ai';
import { useReaderSettings } from '../utils/useReaderSettings';
import { ArrowLeft, Settings, Sparkles, ChevronLeft, ChevronRight, Type, AlignJustify, Scroll, X, List } from 'lucide-react';
import SummaryModal from './SummaryModal';
import SettingsModal from './SettingsModal';

const Reader = ({ book, onBack }) => {
    const viewerRef = useRef(null);
    const renditionRef = useRef(null);
    const bookRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [toc, setToc] = useState([]);

    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState('');

    // ✅ Persisted appearance settings
    const { settings, update } = useReaderSettings();
    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // ✅ Session Tracking
    const sessionRef = useRef({
        startTime: Date.now(),
        startPage: null,
        lastPage: null,
        maxPageReached: 0
    });

    useEffect(() => {
        if (!book || !viewerRef.current) return;

        if (renditionRef.current) {
            renditionRef.current.destroy();
        }

        // ✅ book.file is now an ArrayBuffer — pass directly to ePub
        const epubBook = ePub(book.file);
        bookRef.current = epubBook;

        const rendition = epubBook.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: flow,
            manager: flow === 'paginated' ? 'default' : 'continuous',
        });

        renditionRef.current = rendition;

        const initBook = async () => {
            await rendition.display(book.cfi || undefined);
            updateTheme(rendition);
            setIsReady(true);

            epubBook.loaded.navigation.then(({ toc }) => {
                setToc(toc);
            });

            rendition.on('relocated', (location) => {
                setLocation(location);
                updateProgress(book.id, location.start.cfi);

                const currentPage = location.start.displayed?.page;
                if (currentPage !== undefined) {
                    if (sessionRef.current.startPage === null) {
                        sessionRef.current.startPage = currentPage;
                    }
                    sessionRef.current.lastPage = currentPage;
                    sessionRef.current.maxPageReached = Math.max(sessionRef.current.maxPageReached, currentPage);
                }
            });
        };

        initBook();

        return () => {
            if (renditionRef.current) {
                renditionRef.current.destroy();
            }
        };
    }, [book, flow]);

    // Update styles when settings change
    useEffect(() => {
        if (renditionRef.current) {
            updateTheme(renditionRef.current);
        }
    }, [theme, fontSize, fontFamily, lineHeight]);

    const updateTheme = (rendition) => {
        const themes = {
            light: { color: '#1a1a1a', background: '#ffffff' },
            dark: { color: '#e5e7eb', background: '#111827' },
            sepia: { color: '#5b4636', background: '#f4ecd8' }
        };

        const selectedTheme = themes[theme] || themes.light;

        // Force colors using !important so hardcoded book styles don't override the app theme
        const rules = {
            'body': {
                'background': `${selectedTheme.background} !important`,
                'color': `${selectedTheme.color} !important`,
                'font-family': `${fontFamily} !important`,
                'line-height': `${lineHeight} !important`,
                'font-size': `${fontSize}% !important`,
                'padding': '0 10px !important',
            },
            'p, div, span, h1, h2, h3, h4, h5, h6, li, blockquote, a': {
                'color': `${selectedTheme.color} !important`,
                'font-family': `${fontFamily} !important`,
                'line-height': `${lineHeight} !important`,
                'background': 'transparent !important'
            }
        };

        // We use a dynamic theme name so epub.js reliably applies the CSS update when toggling back and forth
        const themeName = `custom-${theme}-${Date.now()}`;
        rendition.themes.register(themeName, rules);
        rendition.themes.select(themeName);
    };

    const handleBack = async () => {
        const durationMs = Date.now() - sessionRef.current.startTime;
        let pagesRead = 0;

        if (sessionRef.current.startPage !== null && sessionRef.current.lastPage !== null) {
            pagesRead = Math.abs(sessionRef.current.lastPage - sessionRef.current.startPage);
        }

        // Only save if meaningful (they read for > 5s or turned a page)
        if (durationMs > 5000 || pagesRead > 0) {
            try {
                await saveEbookSession(book.id, pagesRead, durationMs, sessionRef.current.maxPageReached);
            } catch (e) {
                console.warn("Could not save ebook session", e)
            }
        }

        onBack();
    };

    const handlePrev = () => renditionRef.current?.prev();
    const handleNext = () => renditionRef.current?.next();

    // ✅ Extract "Anchors" (first and last readable paragraph of current chapter)
    const extractChapterAnchors = async (epubBook, chapterHref) => {
        try {
            const doc = await epubBook.load(chapterHref);
            const textNodes = Array.from(doc.body.querySelectorAll('p, div'))
                .map(node => node.textContent.trim())
                .filter(text => text.length > 30); // Filters out empty tags and tiny headers

            if (textNodes.length === 0) return { start: '', end: '' };
            if (textNodes.length === 1) return { start: textNodes[0], end: textNodes[0] };

            return {
                start: textNodes[0].substring(0, 150),
                end: textNodes[textNodes.length - 1].substring(0, 150)
            };
        } catch (err) {
            console.warn('Could not extract anchors for:', chapterHref, err);
            return { start: '', end: '' };
        }
    };

    const handleSummarize = async () => {
        const aiSettings = getAISettings();
        const providerConfig = PROVIDERS.find((p) => p.id === aiSettings.provider);
        if (providerConfig?.requiresApiKey && !aiSettings.apiKey) {
            setShowSettings(true);
            return;
        }

        setShowSummary(true);
        setSummaryLoading(true);
        setSummaryText('');

        try {
            const currentLocation = renditionRef.current.location.start;
            const epubBook = bookRef.current;
            const chapterItem = epubBook.spine.get(currentLocation.cfi);
            const chapterName = chapterItem.href;

            let betterChapterTitle = chapterName;
            let previousChapters = [];

            const toc = epubBook.navigation.toc;
            const currentChapterIndex = toc.findIndex(item => item.href.includes(chapterItem.href));

            if (currentChapterIndex !== -1) {
                betterChapterTitle = toc[currentChapterIndex].label;
                previousChapters = toc.slice(0, currentChapterIndex).map(item => item.label);
            }

            const anchors = await extractChapterAnchors(epubBook, chapterItem.href);

            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: betterChapterTitle,
                progress: currentLocation.percentage,
                previousChapters,
                anchors,
            };

            const summary = await generateSummary(metadata);
            setSummaryText(summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText('**API Key Issue:** Your AI API key may be invalid or restricted. Please verify your AI provider settings.');
            } else if (error.message.includes('Too many requests')) {
                setSummaryText(`🚦 **Slow down:** ${error.message}`);
            } else {
                setSummaryText(`Error: ${error.message}. Please check your AI settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-gray-900'}`}>
            {/* Toolbar */}
            <header className={`flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b z-10 shadow-sm backdrop-blur-sm ${theme === 'dark' ? 'border-gray-800 bg-gray-900/90' :
                theme === 'sepia' ? 'border-[#e3dccb] bg-[#f4ecd8]/90' :
                    'border-gray-200 bg-white/90'
                }`}>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={handleBack} className="p-2 hover:opacity-70 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-medium truncate max-w-[100px] sm:max-w-[150px] md:max-w-md text-xs sm:text-base">
                        {book.title}
                    </h1>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={handleSummarize}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors mr-2 ${theme === 'dark' ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50' :
                            'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Summarize</span>
                    </button>

                    <div className={`h-6 w-px mx-1 hidden md:block ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                    <button
                        onClick={() => setShowToc(!showToc)}
                        className={`p-2 rounded-full flex-shrink-0 transition-colors ${showToc ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Table of Contents"
                    >
                        <List size={20} />
                    </button>

                    <button
                        onClick={() => setShowAppearance(!showAppearance)}
                        className={`p-2 rounded-full flex-shrink-0 transition-colors ${showAppearance ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Appearance Settings"
                    >
                        <Type size={20} />
                    </button>

                    <button onClick={() => setShowSettings(true)} className="p-2 flex-shrink-0 hover:opacity-70 rounded-full transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Appearance Menu Popover */}
            {showAppearance && (
                <div className={`absolute top-16 right-4 z-50 w-72 p-4 rounded-xl shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-sm">Appearance</h3>
                        <button onClick={() => setShowAppearance(false)}><X size={16} /></button>
                    </div>

                    {/* Theme */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Theme</label>
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            {['light', 'sepia', 'dark'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => update('theme', t)}
                                    className={`flex-1 py-1.5 rounded-md text-xs capitalize transition-colors ${theme === t ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Size */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Font Size ({fontSize}%)</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => update('fontSize', Math.max(50, fontSize - 10))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">A-</button>
                            <input
                                type="range" min="50" max="200" value={fontSize}
                                onChange={(e) => update('fontSize', Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <button onClick={() => update('fontSize', Math.min(200, fontSize + 10))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">A+</button>
                        </div>
                    </div>

                    {/* Font Family */}
                    <div className="mb-4">
                        <label className="text-xs text-gray-500 mb-2 block">Font Family</label>
                        <select
                            value={fontFamily}
                            onChange={(e) => update('fontFamily', e.target.value)}
                            className={`w-full p-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <option value="Inter, sans-serif">Sans Serif</option>
                            <option value="Merriweather, serif">Serif</option>
                            <option value="monospace">Monospace</option>
                        </select>
                    </div>

                    {/* Width & Line Height Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">Max Width</label>
                            <select
                                value={maxWidth}
                                onChange={(e) => update('maxWidth', e.target.value)}
                                className={`w-full p-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <option value="600px">Narrow</option>
                                <option value="800px">Standard</option>
                                <option value="1000px">Wide</option>
                                <option value="100%">Full</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-2 block">Line Height</label>
                            <select
                                value={lineHeight}
                                onChange={(e) => update('lineHeight', e.target.value)}
                                className={`w-full p-2 rounded-lg text-sm border ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                                    }`}
                            >
                                <option value="1.4">Compact</option>
                                <option value="1.8">Normal</option>
                                <option value="2.2">Loose</option>
                            </select>
                        </div>
                    </div>

                    {/* View Mode */}
                    <div>
                        <label className="text-xs text-gray-500 mb-2 block">View Mode</label>
                        <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            <button
                                onClick={() => update('flow', 'paginated')}
                                className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'paginated' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <AlignJustify size={14} /> Pages
                            </button>
                            <button
                                onClick={() => update('flow', 'scrolled')}
                                className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'scrolled' ? 'bg-white dark:bg-gray-700 shadow-sm font-medium' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Scroll size={14} /> Scroll
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reader Area */}
            <div className={`flex-1 relative overflow-hidden flex justify-center ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-gray-50'
                }`}>
                <div
                    ref={viewerRef}
                    className={`h-full shadow-sm transition-all duration-300 ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'
                        }`}
                    style={{ width: maxWidth === '100%' ? '100%' : maxWidth, maxWidth: '100%' }}
                />

                {/* Navigation Overlays (Desktop - Only for Paginated) */}
                {flow === 'paginated' && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 dark:bg-black/50 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:block z-10"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 dark:bg-black/50 rounded-full shadow-lg hover:scale-110 transition-transform hidden md:block z-10"
                        >
                            <ChevronRight size={24} />
                        </button>

                        {/* Touch zones for mobile */}
                        <div className="absolute inset-y-0 left-0 w-1/6 z-0 md:hidden" onClick={handlePrev} />
                        <div className="absolute inset-y-0 right-0 w-1/6 z-0 md:hidden" onClick={handleNext} />
                    </>
                )}
            </div>

            {/* TOC Sidebar Overlay */}
            {showToc && (
                <div className={`absolute top-14 left-0 bottom-10 w-72 sm:w-80 shadow-2xl z-40 flex flex-col transform transition-transform border-r ${theme === 'dark' ? 'bg-gray-900 border-gray-800' :
                    theme === 'sepia' ? 'bg-[#f4ecd8] border-[#e3dccb]' :
                        'bg-white border-gray-200'
                    }`}>
                    <div className="flex justify-between items-center p-4 border-b border-inherit">
                        <h3 className="font-bold text-lg">Table of Contents</h3>
                        <button onClick={() => setShowToc(false)} className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {toc.length > 0 ? (
                            <ul className="space-y-1">
                                {toc.map((item, idx) => (
                                    <li key={idx}>
                                        <button
                                            onClick={() => {
                                                renditionRef.current.display(item.href);
                                                setShowToc(false);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors truncate"
                                        >
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-sm opacity-60 italic">
                                No chapters found in this book.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer / Progress */}
            <div className={`px-4 py-2 text-center text-xs z-10 relative shadow-[0_-2px_10px_rgba(0,0,0,0.05)] ${theme === 'dark' ? 'border-gray-800 bg-gray-900 border-t text-gray-400' :
                theme === 'sepia' ? 'border-[#e3dccb] bg-[#f4ecd8] text-[#5b4636]/70' :
                    'border-gray-200 bg-white text-gray-500'
                }`}>
                {location ? (
                    <span>
                        {flow === 'paginated'
                            ? `Page ${location.start.displayed.page} of ${location.start.displayed.total}`
                            : `${Math.round(location.start.percentage * 100)}% Completed`
                        }
                    </span>
                ) : 'Loading...'}
            </div>

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
        </div>
    );
};

export default Reader;
