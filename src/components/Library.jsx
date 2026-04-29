import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { saveBook, getBooks, deleteBook } from '../utils/storage';
import { getStreakData } from '../utils/streaks';
import { Book, Plus, Trash2, BookPlus, Flame, BarChart2, Settings, Key, X, BookMarked, Brain, Edit2, Search, Compass, Check } from 'lucide-react';
import AddPhysicalBook from './AddPhysicalBook';
import SettingsModal from './SettingsModal';
import ProductTour from './ProductTour';
import DiscoverModal from './DiscoverModal';
import AddOptionsFab from './AddOptionsFab';

const Library = ({ onOpenBook, onOpenDashboard, onOpenCommonplace, onOpenKnowledgeBase }) => {


    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddPhysical, setShowAddPhysical] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDiscover, setShowDiscover] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0, readToday: false });
    const [hasApiKey, setHasApiKey] = useState(() => !!localStorage.getItem('gemini_api_key'));
    const [dismissedBanner, setDismissedBanner] = useState(() => !!localStorage.getItem('api_banner_dismissed'));
    const [showTour, setShowTour] = useState(false); // Disabled: onboarding tours removed for focus

    // Track which card has delete revealed (touch-friendly long-press or tap-icon)
    const [revealedDeleteId, setRevealedDeleteId] = useState(null);
    const longPressTimer = useRef(null);

    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        loadBooks();
        setStreakData(getStreakData());
    }, []);

    const loadBooks = async () => {
        const storedBooks = await getBooks();
        setBooks(storedBooks.sort((a, b) => b.lastRead - a.lastRead));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            let title = file.name.replace(/\.(epub|pdf)$/i, '');
            let author = 'Unknown Author';
            let coverBlob = null;
            let type = file.name.endsWith('.pdf') ? 'pdf' : 'epub';

            if (type === 'epub') {
                try {
                    const book = ePub(file);
                    await book.ready;
                    const metadata = await book.loaded.metadata;

                    if (metadata.title) title = metadata.title;
                    if (metadata.creator) author = metadata.creator;

                    try {
                        const coverUrl = await book.coverUrl();
                        if (coverUrl) {
                            const response = await fetch(coverUrl);
                            const blob = await response.blob();
                            // Convert cover Blob to ArrayBuffer for iOS stability
                            coverBlob = {
                                buffer: await blob.arrayBuffer(),
                                type: blob.type
                            };
                        }
                    } catch (err) {
                        console.warn('Could not extract cover', err);
                    }
                } catch (err) {
                    console.warn('Failed to parse EPUB metadata:', err);
                }
            }

            // Convert main file to ArrayBuffer for iOS stability
            const fileBuffer = await file.arrayBuffer();

            const newBook = {
                id: Date.now().toString(),
                title: title,
                author: author,
                fileData: {
                    buffer: fileBuffer,
                    type: file.type || (type === 'pdf' ? 'application/pdf' : 'application/epub+zip'),
                    name: file.name
                },
                cover: coverBlob, // Now an object { buffer, type } or null
                cfi: null,
                lastRead: Date.now(),
                format: type,
            };

            await saveBook(newBook);
            await loadBooks();
        } catch (error) {
            console.error('Error adding book:', error);
            alert('Failed to add book. Please try another file.');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (e, bookId) => {
        e.stopPropagation();
        if (!window.confirm('Remove this book from your library?')) return;
        await deleteBook(bookId);
        setRevealedDeleteId(null);
        await loadBooks();
    };

    const handleLongPressStart = (bookId) => {
        longPressTimer.current = setTimeout(() => {
            setRevealedDeleteId(prev => prev === bookId ? null : bookId);
        }, 400);
    };

    const handleLongPressEnd = () => {
        clearTimeout(longPressTimer.current);
    };

    // Dismiss delete button when tapping elsewhere
    const handleCardClick = (book) => {
        if (isEditMode) return;
        if (revealedDeleteId === book.id) {
            setRevealedDeleteId(null);
            return;
        }
        onOpenBook(book);
    };

    return (
        <>
            {/* Header */}
            <header className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 md:px-10 pt-4 pb-4 gap-4 flex-wrap bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20">
                <div className="flex items-center gap-3 sm:gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">My Library</h1>
                    <button
                        id="streak-btn"
                        onClick={onOpenDashboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-full border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors cursor-pointer group"
                        title={`Max Streak: ${streakData.maxStreak} days. Click to view full Dashboard.`}
                    >
                        <Flame
                            size={20}
                            className={`${streakData.readToday ? 'text-orange-500 fill-orange-500' : 'text-gray-400'} group-hover:scale-110 transition-transform`}
                        />
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                            {streakData.currentStreak} Day Streak
                        </span>
                        <BarChart2 size={16} className="text-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {onOpenCommonplace && (
                        <button
                            onClick={onOpenCommonplace}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                            title="Open Commonplace Book"
                        >
                            <BookMarked size={18} className="text-amber-500" />
                            <span className="font-semibold text-sm text-amber-700 dark:text-amber-300 hidden sm:inline">Commonplace</span>
                        </button>
                    )}
                    {onOpenKnowledgeBase && (
                        <button
                            onClick={onOpenKnowledgeBase}
                            className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/30 rounded-full border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer"
                            title="Open Knowledge Base"
                        >
                            <Brain size={18} className="text-violet-500" />
                            <span className="font-semibold text-sm text-violet-700 dark:text-violet-300 hidden sm:inline">Ask</span>
                        </button>
                    )}
                </div>


                <div className="flex items-center gap-3 sm:ml-auto">
                    <button
                        onClick={() => setShowDiscover(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-sm text-sm font-medium border border-indigo-200 dark:border-indigo-800"
                        title="Discover Free Books"
                    >
                        <Compass className="w-[18px] h-[18px]" />
                        <span className="hidden sm:inline">Discover</span>
                    </button>
                    <button
                        id="physical-btn"
                        onClick={() => setShowAddPhysical(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <BookPlus size={18} />
                        <span>Physical</span>
                    </button>
                    <label id="upload-btn" className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm text-sm font-medium">
                        <Plus size={18} />
                        <span>Upload</span>
                        <input
                            type="file"
                            accept=".epub,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </label>
                    <button
                        id="settings-btn"
                        onClick={() => setShowSettings(true)}
                        className={`p-2 rounded-full transition-colors ${hasApiKey
                            ? 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'
                            : 'text-orange-500 bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100'
                            }`}
                        title="AI Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6" style={{ WebkitOverflowScrolling: 'touch' }}>

                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6 gap-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search library..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                        />
                    </div>
                    <div className="flex-shrink-0">
                         <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${
                                isEditMode 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' 
                                : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                         >
                             {isEditMode ? <><Check size={16} /> <span className="hidden sm:inline">Done</span></> : <><Edit2 size={16} /> <span className="hidden sm:inline">Edit</span></>}
                         </button>
                    </div>
                </div>

                {/* First-launch API key banner */}
                {!hasApiKey && !dismissedBanner && (
                    <div className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                        <Key size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Add your Gemini API key to unlock AI features</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Summaries, Recall, and Explain won't work without it.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => setShowSettings(true)}
                                className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
                            >
                                Add Key
                            </button>
                            <button
                                onClick={() => { setDismissedBanner(true); localStorage.setItem('api_banner_dismissed', '1'); }}
                                className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={book.title}>
                                {book.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {book.author}
                            </p>
                            {book.rating && (
                                <div className="mt-2 text-xs">
                                    <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 px-2 py-1 rounded">
                                        ⭐ {book.rating.toFixed(1)} <span className="text-gray-500 dark:text-gray-400">({book.ratingCount})</span>
                                    </span>
                                </div>
                            )}
                            {book.cfi && (
                                <div className="mt-2 text-xs text-blue-600 font-medium">
                                    In Progress
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isUploading && (
                    <div className="text-center py-4 flex items-center justify-center gap-3 text-sm text-gray-500 mb-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Processing book, please wait...</span>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredBooks.map((book) => (
                        <div
                            key={book.id}
                            className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700 ${isEditMode ? 'animate-wiggle' : ''}`}
                            style={{ touchAction: 'pan-y' }}
                            onClick={() => handleCardClick(book)}
                            onPointerDown={() => !isEditMode && handleLongPressStart(book.id)}
                            onPointerUp={handleLongPressEnd}
                            onPointerLeave={handleLongPressEnd}
                            onPointerCancel={handleLongPressEnd}
                        >
                            <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                {book.cover ? (
                                    <img
                                        src={URL.createObjectURL(
                                            book.cover instanceof Blob
                                                ? book.cover
                                                : new Blob([book.cover.buffer || book.cover], { type: book.cover.type || 'image/jpeg' })
                                        )}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                        <Book size={48} className="mb-2" />
                                        <span className="text-xs">{book.title}</span>
                                    </div>
                                )}
                                {/* Delete button */}
                                {(isEditMode || revealedDeleteId === book.id) && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity z-10">
                                        <button
                                            onClick={(e) => handleDelete(e, book.id)}
                                            className="p-3 bg-red-600 text-white rounded-full shadow-xl transition-transform hover:scale-110 active:scale-95"
                                            title="Remove book"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                        {!isEditMode && (
                                            <div className="absolute bottom-2 text-white text-xs font-medium bg-red-600/90 px-2 py-1 rounded">
                                                Tap 🗑 to remove
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={book.title}>
                                    {book.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {book.author}
                                </p>
                                {book.type === 'physical' && book.totalPages ? (
                                    <div className="mt-2 text-xs text-emerald-600 font-medium">
                                        {Math.round((book.currentPage / book.totalPages) * 100) || 0}% Complete
                                    </div>
                                ) : book.progress !== undefined ? (
                                    <div className="mt-2 text-xs text-blue-600 font-medium">
                                        {Math.round(book.progress * 100)}% Complete
                                    </div>
                                ) : book.cfi ? (
                                    <div className="mt-2 text-xs text-blue-600 font-medium">
                                        In Progress
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}

                    {filteredBooks.length === 0 && !isUploading && (
                        <div className="col-span-full pt-10 pb-20 max-w-2xl mx-auto w-full">
                            <div className="text-center mb-8">
                                <Book size={48} className="mx-auto text-blue-500 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your library is empty</h2>
                                <p className="text-gray-500 dark:text-gray-400">Let's populate it. Choose an option to get started!</p>
                            </div>
                            
                            <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
                                <button
                                    onClick={() => setShowDiscover(true)}
                                    className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-500 hover:shadow-lg transition-all text-center group"
                                >
                                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Compass size={32} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Discover Classics</h3>
                                    <p className="text-xs text-gray-500">Download free public domain books exactly like Pride and Prejudice.</p>
                                </button>

                                <label className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-500 hover:shadow-lg transition-all text-center cursor-pointer group">
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Plus size={32} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Upload File</h3>
                                    <p className="text-xs text-gray-500">Import your own .epub or .pdf files to establish your collection.</p>
                                    <input
                                        type="file"
                                        accept=".epub,.pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                </label>

                                <button
                                    onClick={() => setShowAddPhysical(true)}
                                    className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-500 hover:shadow-lg transition-all text-center group"
                                >
                                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <BookPlus size={32} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add Physical</h3>
                                    <p className="text-xs text-gray-500">Manually log progress for a paper-backed physical book.</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {showAddPhysical && (
                    <AddPhysicalBook
                        onClose={() => setShowAddPhysical(false)}
                        onBookAdded={() => {
                            setShowAddPhysical(false);
                            loadBooks();
                        }}
                    />
                )}
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => {
                    setShowSettings(false);
                    const key = localStorage.getItem('gemini_api_key');
                    setHasApiKey(!!key);
                    if (key) setDismissedBanner(true);
                }}
            />

            <ProductTour
                run={showTour}
                onComplete={() => {
                    localStorage.setItem('has_seen_interactive_tour', 'true');
                    setShowTour(false);
                }}
            />

            <DiscoverModal 
                isOpen={showDiscover} 
                onClose={() => setShowDiscover(false)} 
                onBookAdded={() => {
                    loadBooks();
                }} 
            />

            <AddOptionsFab 
                onUpload={handleFileUpload}
                onPhysical={() => setShowAddPhysical(true)}
                onDiscover={() => setShowDiscover(true)}
                disabled={isUploading}
                isHidden={showDiscover || showAddPhysical || showSettings}
            />
        </>
    );
};

export default Library;
