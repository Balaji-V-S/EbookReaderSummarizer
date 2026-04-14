import React, { useState, useEffect } from 'react';
import { X, Search, Download, BookOpen, Loader2, CheckCircle2 } from 'lucide-react';
import { saveBook } from '../utils/storage';

const DiscoverModal = ({ isOpen, onClose, onBookAdded }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadedIds, setDownloadedIds] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchBooks();
        }
    }, [isOpen]);

    const fetchBooks = async (query = '') => {
        setLoading(true);
        try {
            const url = query 
                ? `https://gutendex.com/books/?search=${encodeURIComponent(query)}`
                : 'https://gutendex.com/books/?sort=popular';
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Filter to only books that have an epub format available
            const viableBooks = data.results.filter(book => 
                book.formats['application/epub+zip']
            );
            
            setBooks(viableBooks);
        } catch (error) {
            console.error('Failed to fetch from Gutendex:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchBooks(searchQuery);
    };

    const handleDownload = (book) => {
        const epubUrl = book.formats['application/epub+zip'];
        
        if (!epubUrl) return;

        // Directly trigger native browser download
        window.location.href = epubUrl;
        
        alert(`You are downloading "${book.title}" directly from Project Gutenberg to your device's Downloads folder.\n\nOnce the download finishes, simply use the "Upload File" button in your Library to add it to your collection!`);
        
        // Mark as interacted/downloaded locally for UI state
        setDownloadedIds(prev => new Set(prev).add(book.id));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <BookOpen className="text-blue-500" />
                            Discover Free Classics
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                            Download free public domain books powered by Project Gutenberg.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-800">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <button 
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 dark:bg-gray-900">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p>Loading books from Gutenberg...</p>
                        </div>
                    ) : books.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {books.map(book => (
                                <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                    <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                        {book.formats['image/jpeg'] ? (
                                            <img 
                                                src={book.formats['image/jpeg']} 
                                                alt={book.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <BookOpen size={48} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                                            <div className="w-full pointer-events-auto">
                                                {downloadedIds.has(book.id) ? (
                                                    <button disabled className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                                                        <CheckCircle2 size={16} /> In Library
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(book); }}
                                                        disabled={downloadingId === book.id}
                                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400"
                                                    >
                                                        {downloadingId === book.id ? (
                                                            <><Loader2 size={16} className="animate-spin" /> Fetching...</>
                                                        ) : (
                                                            <><Download size={16} /> Get Book</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-tight" title={book.title}>
                                            {book.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                            {book.authors?.length > 0 ? book.authors[0].name : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BookOpen size={48} className="mb-4 opacity-50" />
                            <p>No free books found for this query.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscoverModal;
