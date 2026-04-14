import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Upload, BookPlus, Compass } from 'lucide-react';

const AddOptionsFab = ({ onUpload, onPhysical, onDiscover, disabled, isHidden }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    if (isHidden) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end sm:hidden" ref={menuRef}>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed -inset-[200vh] bg-black/40 backdrop-blur-sm -z-10 transition-opacity duration-300" 
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Menu Options */}
            <div className={`relative flex flex-col items-end gap-3 mb-4 transition-all duration-300 origin-bottom right-0 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8 pointer-events-none'}`}>
                
                <button
                    onClick={() => { setIsOpen(false); onDiscover(); }}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-2 pr-4 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium border border-gray-100 dark:border-gray-700 group ring-2 ring-transparent focus:ring-blue-500 outline-none"
                    aria-label="Discover Free Classics"
                >
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Compass size={20} />
                    </div>
                    <span className="text-sm">Discover Free Classics</span>
                </button>

                <button
                    onClick={() => { setIsOpen(false); onPhysical(); }}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-2 pr-4 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium border border-gray-100 dark:border-gray-700 group ring-2 ring-transparent focus:ring-blue-500 outline-none"
                    aria-label="Add Physical Book"
                >
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookPlus size={20} />
                    </div>
                    <span className="text-sm">Add Physical Book</span>
                </button>

                <label className="flex items-center gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-2 pr-4 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium cursor-pointer border border-gray-100 dark:border-gray-700 group ring-2 ring-transparent focus-within:ring-blue-500 outline-none">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Upload size={20} />
                    </div>
                    <span className="text-sm">Upload File (.epub)</span>
                    <input
                        type="file"
                        accept=".epub,.pdf"
                        onChange={(e) => { setIsOpen(false); onUpload(e); }}
                        className="hidden"
                        disabled={disabled}
                    />
                </label>

            </div>

            {/* Extended FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center gap-2 px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 font-semibold text-white z-10 ${isOpen ? 'bg-gray-800 ring-4 ring-gray-900/20' : 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-600/30'}`}
                aria-label={isOpen ? "Close Menu" : "Add Book"}
            >
                <div className={`transition-transform duration-300 flex items-center justify-center ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
                    {isOpen ? <X size={24} /> : <Plus size={24} />}
                </div>
                {!isOpen && <span>Add Book</span>}
            </button>
        </div>
    );
};

export default AddOptionsFab;
