import React, { useState } from 'react';
import { Book, Search, X, Camera } from 'lucide-react';
import { saveBook } from '../utils/storage';

const AddPhysicalBook = ({ onClose, onBookAdded }) => {
    const [isbn, setIsbn] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualForm, setManualForm] = useState({ title: '', author: '', totalPages: '300' });

    const searchBook = async (e) => {
        e.preventDefault();
        if (!isbn) return;

        setLoading(true);
        setError('');

        try {
            const cleanIsbn = isbn.replace(/[-\s]/g, '');

            let response = await fetch(
                `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`
            );
            let data = await response.json();

            if (Object.keys(data).length > 0) {
                const bookKey = Object.keys(data)[0];
                const bookInfo = data[bookKey];

                let coverBlob = null;
                if (bookInfo.cover?.medium) {
                    try {
                        const imgRes = await fetch(bookInfo.cover.medium);
                        coverBlob = await imgRes.blob();
                    } catch (e) {
                        console.warn("Could not fetch cover blob");
                    }
                }

                const authors = bookInfo.authors?.map((a) => a.name).join(', ') || 'Unknown Author';

                const newBook = {
                    id: Date.now().toString(),
                    type: 'physical',
                    title: bookInfo.title || 'Unknown Title',
                    author: authors,
                    totalPages: bookInfo.number_of_pages || 300,
                    currentPage: 0,
                    cover: coverBlob,
                    sessions: [],
                    lastRead: Date.now(),
                };

                await saveBook(newBook);
                onBookAdded();
                onClose();
            } else {
                setError('Book not found. Try the manual entry below or check the ISBN format.');
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Scan or Enter ISBN
                                </label>
                                <div className="relative">
                                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={isbn}
                                        onChange={(e) => setIsbn(e.target.value)}
                                        placeholder="e.g. 9780544003415"
                                        className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none transition-all"
                                    />
                                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors" title="Scan Barcode (Coming Soon)">
                                        <Camera size={20} />
                                    </button>
                                </div>
                                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !isbn}
                                className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    "Search & Add Book"
                                )}
                            </button>

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
