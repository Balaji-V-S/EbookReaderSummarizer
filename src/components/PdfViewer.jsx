import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { updateProgress } from '../utils/storage';
import SettingsModal from './SettingsModal';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * PdfViewer — renders a PDF using the browser's native PDF viewer inside an iframe.
 * Used for books with format === 'pdf'.
 */
const PdfViewer = ({ book, onBack }) => {
    const [objectUrl, setObjectUrl] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState(null);
    const startTimeRef = useRef(Date.now());

    // Build object URL from stored ArrayBuffer or Blob
    useEffect(() => {
        if (!book?.file) {
            setError('No file data found for this PDF.');
            return;
        }
        try {
            let blob;
            if (book.file instanceof Blob) {
                // Already a Blob / File — just ensure correct MIME
                blob = new Blob([book.file], { type: 'application/pdf' });
            } else {
                // ArrayBuffer stored in IndexedDB
                blob = new Blob([book.file], { type: 'application/pdf' });
            }
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        } catch (err) {
            setError('Could not load PDF: ' + err.message);
        }
    }, [book?.id]);

    // Status bar
    useEffect(() => {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => { });
        return () => { StatusBar.show().catch(() => { }); };
    }, []);

    // Save a rough progress estimate when leaving (time-based)
    const handleBack = async () => {
        try {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            // We can't know the exact page/percentage for a native iframe PDF,
            // so just record lastRead + a small progress bump
            const currentProgress = book.progress ?? 0;
            const bumped = Math.min(1, currentProgress + 0.01);
            await updateProgress(book.id, null, bumped, book.title ?? 'this book');
        } catch (_) { }
        onBack();
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 z-50">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-700 text-gray-200">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-gray-100 truncate max-w-[200px]">
                        {book.title}
                    </span>
                </div>
                <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-gray-700 text-gray-200">
                    <Settings size={20} />
                </button>
            </header>

            {/* PDF iframe */}
            {error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={onBack} className="px-4 py-2 bg-red-700 text-white rounded-xl text-sm">Go Back</button>
                </div>
            ) : objectUrl ? (
                <iframe
                    src={objectUrl}
                    className="flex-1 w-full border-0"
                    title={book.title || 'PDF'}
                    style={{ background: '#525659' }}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    Loading PDF…
                </div>
            )}

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
};

export default PdfViewer;
