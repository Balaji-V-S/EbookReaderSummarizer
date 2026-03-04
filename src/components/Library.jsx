import React, { useState, useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { saveBook, getBooks, deleteBook } from '../utils/storage';
import { getStreakData } from '../utils/streaks';
import { Book, Plus, Trash2, BookPlus, Flame, BarChart2, Settings, Key, X } from 'lucide-react';
import AddPhysicalBook from './AddPhysicalBook';
import SettingsModal from './SettingsModal';

const Library = ({ onOpenBook, onOpenDashboard }) => {
    const [books, setBooks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddPhysical, setShowAddPhysical] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0, readToday: false });
    const [hasApiKey, setHasApiKey] = useState(() => !!localStorage.getItem('gemini_api_key'));
    const [dismissedBanner, setDismissedBanner] = useState(() => !!localStorage.getItem('api_banner_dismissed'));
    // Track which card has delete revealed (touch-friendly long-press or tap-icon)
    const [revealedDeleteId, setRevealedDeleteId] = useState(null);
    const longPressTimer = useRef(null);

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
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                    <button
                        onClick={() => setShowAddPhysical(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <BookPlus size={18} />
                        <span>Physical</span>
                    </button>
                    <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors shadow-sm text-sm font-medium">
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
            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6">

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
                    </div>
                )}

                {isUploading && (
                    <div className="text-center py-4 flex items-center justify-center gap-3 text-sm text-gray-500 mb-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span>Processing book, please wait...</span>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {books.map((book) => (
                        <div
                            key={book.id}
                            className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700"
                            onClick={() => handleCardClick(book)}
                            onPointerDown={() => handleLongPressStart(book.id)}
                            onPointerUp={handleLongPressEnd}
                            onPointerLeave={handleLongPressEnd}
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
                                {/* Delete button — always visible via long-press reveal, or hover on desktop */}
                                <button
                                    onClick={(e) => handleDelete(e, book.id)}
                                    className={`absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-md transition-all duration-200 hover:bg-red-700 active:scale-90 ${revealedDeleteId === book.id ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100'
                                        }`}
                                    title="Remove book"
                                >
                                    <Trash2 size={14} />
                                </button>
                                {/* Long-press hint badge — shown while delete is revealed */}
                                {revealedDeleteId === book.id && (
                                    <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-xs text-center py-1 font-medium">
                                        Tap 🗑 to remove
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
                                {book.cfi && (
                                    <div className="mt-2 text-xs text-blue-600 font-medium">
                                        In Progress
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {books.length === 0 && !isUploading && (
                        <div className="col-span-full text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Book size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">No books yet. Add a physical book or upload an EPUB to get started!</p>
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
        </>
    );
};

export default Library;
