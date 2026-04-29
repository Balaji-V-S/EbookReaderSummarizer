import React, { useState, useEffect } from 'react';
import { X, BookOpen, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DictionaryModal = ({ isOpen, onClose, word }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen || !word) return;

        const fetchDefinition = async () => {
            setLoading(true);
            setError(null);
            setData(null);

            try {
                // Clean the word (remove punctuation)
                const cleanWord = word.trim().replace(/[.,!?;:"'()]/g, '');
                if (!cleanWord) throw new Error("Please select a valid word.");

                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
                if (!res.ok) {
                    throw new Error("Word not found in dictionary.");
                }
                const json = await res.json();
                setData(json[0]);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDefinition();
    }, [isOpen, word]);

    const playAudio = (phonetics) => {
        const audioObj = phonetics.find(p => p.audio);
        if (audioObj && audioObj.audio) {
            new Audio(audioObj.audio).play();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm sm:backdrop-blur-none" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col"
                >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <BookOpen size={20} />
                            <h2 className="font-semibold text-lg">Dictionary</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-5 overflow-y-auto flex-1">
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                <div className="space-y-2 mt-4">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                <p>{error}</p>
                            </div>
                        ) : data ? (
                            <div>
                                <div className="flex items-end gap-3 mb-1">
                                    <h1 className="text-2xl font-bold dark:text-white capitalize">{data.word}</h1>
                                    {data.phonetics?.some(p => p.audio) && (
                                        <button
                                            onClick={() => playAudio(data.phonetics)}
                                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
                                            title="Listen to pronunciation"
                                        >
                                            <Volume2 size={18} />
                                        </button>
                                    )}
                                </div>

                                {data.phonetic && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-mono">{data.phonetic}</p>
                                )}

                                <div className="space-y-4">
                                    {data.meanings.slice(0, 3).map((meaning, idx) => (
                                        <div key={idx}>
                                            <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mb-2 italic">
                                                {meaning.partOfSpeech}
                                            </div>
                                            <ol className="list-decimal list-outside ml-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                                {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                                                    <li key={defIdx} className="pl-1">
                                                        <span>{def.definition}</span>
                                                        {def.example && (
                                                            <p className="text-gray-500 dark:text-gray-400 italic mt-1 text-xs">"{def.example}"</p>
                                                        )}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DictionaryModal;
