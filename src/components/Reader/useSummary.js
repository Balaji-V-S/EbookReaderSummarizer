import { useState } from 'react';
import { generateSummary } from '../../utils/gemini';
import { saveSummary, setBookGenre } from '../../utils/storage';

/**
 * Generates and stores the AI chapter summary.
 */
export const useSummary = ({ book, location, viewerRef, setShowSettings }) => {
    const [showSummary, setShowSummary] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [showGenrePicker, setShowGenrePicker] = useState(false);

    const handleSummarize = async () => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) { setShowSettings(true); return; }

        // Genre gate — ask once before the first summary, then never again
        if (!book.genre) { setShowGenrePicker(true); return; }

        await _runSummary();
    };

    // Called when genre picker confirms a genre
    const handleGenreConfirmed = async (genre) => {
        await setBookGenre(book.id, genre);
        book.genre = genre; // patch in-memory so _runSummary picks it up
        setShowGenrePicker(false);
        await _runSummary();
    };

    const _runSummary = async () => {
        const apiKey = localStorage.getItem('gemini_api_key');
        if (!apiKey) return; // safety guard

        setShowSummary(true);
        setSummaryLoading(true);
        setSummaryText('');

        try {
            const view = viewerRef.current;
            const foliateBook = view.book;
            const currentLocationDetail = location?.start;
            const currentSectionIndex = location?.start?.displayed?.page
                ? location.start.displayed.page - 1 : 0;
            const chapterItem = foliateBook.sections[currentSectionIndex];

            let betterChapterTitle = chapterItem?.id || `Section ${currentSectionIndex}`;
            let previousChapters = [];
            const tocItems = foliateBook.toc || [];
            const currentChapterIndex = tocItems.findIndex(
                item => item.href && item.href.includes(chapterItem?.id)
            );
            if (currentChapterIndex !== -1) {
                betterChapterTitle = tocItems[currentChapterIndex].label;
                previousChapters = tocItems.slice(0, currentChapterIndex).map(item => item.label);
            }

            let anchors = { start: '', end: '' };
            if (chapterItem?.createDocument) {
                try {
                    const doc = await chapterItem.createDocument();
                    const textNodes = Array.from(doc.body.querySelectorAll('p, div'))
                        .map(node => node.textContent.trim())
                        .filter(text => text.length > 30);
                    if (textNodes.length > 0) {
                        anchors.start = textNodes[0].substring(0, 150);
                        anchors.end = textNodes[textNodes.length - 1].substring(0, 150);
                    }
                } catch (e) { console.warn(e); }
            }

            const metadata = {
                title: book.title,
                author: book.author,
                chapterName: betterChapterTitle,
                progress: currentLocationDetail?.percentage
                    || Math.max(0, currentSectionIndex / foliateBook.sections.length),
                previousChapters,
                anchors,
            };

            const summary = await generateSummary(metadata, apiKey);
            setSummaryText(summary);
            await saveSummary(book.id, betterChapterTitle, summary);
        } catch (error) {
            console.error(error);
            if (error.message.includes('limit: 0')) {
                setSummaryText(
                    `**API Key Issue:** Your Gemini API Key has its free tier limit set to 0.\n\nThis usually means Google requires you to enable billing in your Google Cloud Console for this project.\n\n[Go to Google AI Studio](https://aistudio.google.com/app/apikey)`
                );
            } else if (error.message.includes('Too many requests')) {
                setSummaryText(`🚦 **Slow down:** ${error.message}`);
            } else {
                setSummaryText(`Error: ${error.message}. Please check your API Key in settings.`);
            }
        } finally {
            setSummaryLoading(false);
        }
    };

    return {
        showSummary, setShowSummary,
        summaryLoading, summaryText,
        handleSummarize,
        showGenrePicker, setShowGenrePicker, handleGenreConfirmed,
    };
};
