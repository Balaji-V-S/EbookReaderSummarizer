import React, { useState } from 'react';
import { Book, Search, X, Camera, ChevronRight } from 'lucide-react';
import { saveBook } from '../utils/storage';

const AddPhysicalBook = ({ onClose, onBookAdded }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('isbn'); // 'isbn' or 'author'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [searchResults, setSearchResults] = useState([]); // For author search results
    const [selectedBook, setSelectedBook] = useState(null); // For preview
    const [manualForm, setManualForm] = useState({ title: '', author: '', totalPages: '300' });

    const addBookToLibrary = async (bookInfo) => {
        let coverBlob = null;
        let coverUrl = null;

        if (bookInfo.cover) {
            // Handle both URL string (from author search) and object with .medium (from ISBN search)
            const imageUrl = typeof bookInfo.cover === 'string' ? bookInfo.cover : bookInfo.cover.medium;
            if (imageUrl) {
                try {
                    const imgRes = await fetch(imageUrl);
                    coverBlob = await imgRes.blob();
                    coverUrl = imageUrl;
                } catch (e) {
                    console.warn("Could not fetch cover image", e);
                }
            }
        }

        const authors = Array.isArray(bookInfo.authors)
            ? bookInfo.authors.map((a) => a.name || a).join(', ')
            : (bookInfo.author || 'Unknown Author');

        const newBook = {
            id: Date.now().toString(),
            type: 'physical',
            title: bookInfo.title || 'Unknown Title',
            author: authors,
            totalPages: bookInfo.pages || bookInfo.number_of_pages || 300,
            currentPage: 0,
            cover: coverBlob,
            coverUrl: coverUrl,
            sessions: [],
            lastRead: Date.now(),
        };

        await saveBook(newBook);
        onBookAdded();
        onClose();
    };

    const searchBook = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setSearchResults([]);

        try {
            if (searchType === 'isbn') {
                const cleanIsbn = searchQuery.replace(/[-\s]/g, '');
                const response = await fetch(
                    `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`
                );
                const data = await response.json();

                if (Object.keys(data).length > 0) {
                    const bookKey = Object.keys(data)[0];
                    const bookInfo = data[bookKey];
                    await addBookToLibrary(bookInfo);
                } else {
                    setError('Book not found. Try author search or manual entry.');
                }
            } else {
                // Author search
                const response = await fetch(
                    `https://openlibrary.org/search.json?author=${encodeURIComponent(searchQuery)}&limit=100`
                );
                const data = await response.json();

                if (data.docs && data.docs.length > 0) {
                    // Filter: exclude summaries, guides, reviews, etc. and prioritize books with covers
                    const filterKeywords = [
                        'summary', 'summaries', 'guide', 'review', 'sparknotes', 'cliffsnotes',
                        'instaread', 'audiobook', 'audiobooks', 'analysis', 'study guide'
                    ];
                    const results = data.docs
                        .filter((doc) => {
                            const title = doc.title.toLowerCase();
                            const isSummaryOrGuide = filterKeywords.some((keyword) => title.includes(keyword));
                            const hasCover = doc.cover_i; // Only include books with covers
                            return !isSummaryOrGuide && hasCover;
                        })
                        .sort((a, b) => (b.edition_count || 0) - (a.edition_count || 0)) // Sort by popularity
                        .slice(0, 20) // Show top 20 books
                        .map((doc) => ({
                            title: doc.title,
                            author: doc.author_name?.[0] || 'Unknown Author',
                            pages: doc.number_of_pages_median || 300,
                            cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                            key: doc.key,
                        }));

                    if (results.length > 0) {
                        setSearchResults(results);
                    } else {
                        setError('No actual books found. Try ISBN search or manual entry.');
                    }
                } else {
                    setError('No books found by this author. Try manual entry.');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Try again or use manual entry.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualAdd = async (e) => {
        e.preventDefault();
        if (!manualForm.title || !manualForm.author) {
            setError('Please enter title and author.');
            return;
        }

        const newBook = {
            id: Date.now().toString(),
            type: 'physical',
            title: manualForm.title,
            author: manualForm.author,
            totalPages: parseInt(manualForm.totalPages) || 300,
            currentPage: 0,
            cover: null,
            sessions: [],
            lastRead: Date.now(),
        };

        await saveBook(newBook);
        onBookAdded();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl flex flex-col m-2 sm:m-4 shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 sm:p-6 overflow-y-auto w-full">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Book size={24} className="text-blue-500" />
                            Add Physical Book
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {!showManualEntry ? (
                        <form onSubmit={searchBook} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Search Type
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchType('isbn');
                                            setSearchQuery('');
                                            setSearchResults([]);
                                            setError('');
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                                            searchType === 'isbn'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        ISBN
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchType('author');
                                            setSearchQuery('');
                                            setSearchResults([]);
                                            setError('');
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                                            searchType === 'author'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        Author
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {searchType === 'isbn' ? 'Scan or Enter ISBN' : 'Enter Author Name'}
                                </label>
                                <div className="relative">
                                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchType === 'isbn' ? 'e.g. 9780544003415' : 'e.g. J.K. Rowling'}
                                        className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                    />
                                    {searchType === 'isbn' && (
                                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors" title="Scan Barcode (Coming Soon)">
                                            <Camera size={20} />
                                        </button>
                                    )}
                                </div>
                                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !searchQuery.trim()}
                                className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    `Search ${searchType === 'isbn' ? 'ISBN' : 'Author'}`
                                )}
                            </button>

                            {!selectedBook && searchResults.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Found {searchResults.length} books:</h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {searchResults.map((book, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setSelectedBook(book)}
                                                className="w-full flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                                            >
                                                {book.cover && (
                                                    <img src={book.cover} alt={book.title} className="w-12 h-16 rounded object-cover" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate">{book.title}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{book.author}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">{book.pages} pages</p>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-400 flex-shrink-0 my-auto" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedBook && (
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center gap-6">
                                        {selectedBook.cover && (
                                            <img
                                                src={selectedBook.cover}
                                                alt={selectedBook.title}
                                                className="w-32 h-48 rounded-lg object-cover shadow-lg"
                                            />
                                        )}
                                        <div className="text-center w-full">
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                                {selectedBook.title}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-1">{selectedBook.author}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-500">{selectedBook.pages} pages</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBook(null)}
                                            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loading}
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await addBookToLibrary(selectedBook);
                                                } catch (err) {
                                                    console.error(err);
                                                    setError('Failed to add book.');
                                                    setLoading(false);
                                                }
                                            }}
                                            className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                                        >
                                            {loading ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            ) : (
                                                'Add Book'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowManualEntry(true);
                                    setError('');
                                }}
                                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Enter Manually
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleManualAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Book Title
                                </label>
                                <input
                                    type="text"
                                    value={manualForm.title}
                                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                                    placeholder="e.g. The Great Gatsby"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Author
                                </label>
                                <input
                                    type="text"
                                    value={manualForm.author}
                                    onChange={(e) => setManualForm({ ...manualForm, author: e.target.value })}
                                    placeholder="e.g. F. Scott Fitzgerald"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total Pages
                                </label>
                                <input
                                    type="number"
                                    value={manualForm.totalPages}
                                    onChange={(e) => setManualForm({ ...manualForm, totalPages: e.target.value })}
                                    placeholder="300"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                />
                            </div>

                            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowManualEntry(false);
                                        setError('');
                                    }}
                                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl py-3 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                                >
                                    Add Book
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPhysicalBook;
