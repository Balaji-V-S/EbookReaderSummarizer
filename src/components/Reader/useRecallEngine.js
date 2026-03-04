import { useState, useRef, useEffect } from 'react';
import { generateRecall, generateOrientation } from '../../utils/gemini';

/**
 * Manages the Recall Engine: auto-trigger on book open and manual recall generation.
 */
export const useRecallEngine = ({ book, location, viewerRef, setShowSettings }) => {
    const [showRecall, setShowRecall] = useState(false);
    const [recallText, setRecallText] = useState('');
    const [recallLoading, setRecallLoading] = useState(false);
    const [recallError, setRecallError] = useState(null);
    const [recallLength, setRecallLength] = useState('standard');
    const [isOrientation, setIsOrientation] = useState(false);
    const recallContextRef = useRef(null);
    const wasAutoRecallRef = useRef(false);

    // Auto-trigger recall when the book is opened (new or lapsed reader)
    useEffect(() => {
        if (!book) return;

        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const isNewBook = !book.cfi && (!book.sessions || book.sessions.length === 0);
        const isLapsedReader = book.lastRead && (Date.now() - book.lastRead) > THREE_DAYS_MS && !isNewBook;

        // Only trigger for new or lapsed readers
        if (!isNewBook && !isLapsedReader) return;

        // Don't open the modal at all if no API key — silently skip
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return;

        setIsOrientation(isNewBook);
        setShowRecall(true);
        setRecallLoading(true);
        wasAutoRecallRef.current = !isNewBook;
        setRecallError(null);
        setRecallText('');

        const metadata = {
            title: book.title || 'this book',
            author: book.author || 'Unknown Author',
            chapterName: null,
            progress: 0,
            previousChapters: [],
            anchors: {},
        };

        const fetchData = isNewBook
            ? generateOrientation(metadata, apiKey)
            : generateRecall(metadata, apiKey, 'standard');

        fetchData
            .then(text => { setRecallText(text); recallContextRef.current = metadata; })
            .catch(err => setRecallError(err.message || 'Could not generate recall.'))
            .finally(() => setRecallLoading(false));
    }, [book?.id]);

    const handleRecall = async (length = recallLength) => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) { setShowSettings(true); return; }

        setRecallLength(length);
        setShowRecall(true);
        setRecallLoading(true);
        setRecallError(null);
        setRecallText('');

        try {
            const view = viewerRef.current;
            const foliateBook = view?.book;
            const currentLocationDetail = location?.start;
            const currentSectionIndex = currentLocationDetail?.displayed?.page
                ? currentLocationDetail.displayed.page - 1 : 0;

            let chapterName = `Section ${currentSectionIndex + 1}`;
            let previousChapters = [];
            let anchors = { start: '' };

            if (foliateBook) {
                const tocItems = foliateBook.toc || [];
                const chapterItem = foliateBook.sections?.[currentSectionIndex];
                const tocIdx = tocItems.findIndex(
                    item => item.href && chapterItem?.id && item.href.includes(chapterItem.id)
                );
                if (tocIdx !== -1) {
                    chapterName = tocItems[tocIdx].label;
                    previousChapters = tocItems.slice(0, tocIdx).map(i => i.label);
                }
                if (chapterItem?.createDocument) {
                    try {
                        const doc = await chapterItem.createDocument();
                        const textNodes = Array.from(doc.body.querySelectorAll('p, div'))
                            .map(n => n.textContent.trim()).filter(t => t.length > 30);
                        if (textNodes[0]) anchors.start = textNodes[0].substring(0, 150);
                    } catch (_) { /* no-op */ }
                }
            }

            const metadata = {
                title: book.title || 'this book',
                author: book.author || 'Unknown Author',
                chapterName,
                progress: currentLocationDetail?.percentage ?? 0,
                previousChapters,
                anchors,
            };
            recallContextRef.current = metadata;

            const text = await generateRecall(metadata, apiKey, length);
            setRecallText(text);
        } catch (err) {
            setRecallError(err.message || 'Could not generate recall. Please check your API key.');
        } finally {
            setRecallLoading(false);
        }
    };

    return {
        showRecall, setShowRecall,
        recallText, recallLoading, recallError,
        recallLength, setRecallLength,
        isOrientation,
        wasAutoRecallRef,
        handleRecall,
    };
};
