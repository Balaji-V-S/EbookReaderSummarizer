import { useEffect, useRef } from 'react';
import { Overlayer } from 'foliate-js/overlayer.js';
import { updateProgress, getHighlights } from '../../utils/storage';

/** Builds the CSS string to inject into the Foliate iframe */
const buildReaderCSS = (s) => {
    const THEMES = {
        light: { color: '#1a1a1a', background: '#ffffff' },
        dark:  { color: '#e5e7eb', background: '#111827' },
        sepia: { color: '#5b4636', background: '#f4ecd8' },
    };
    const t = THEMES[s.theme] || THEMES.light;
    // Apply font-size to every text element — not just body.
    // EPUB files often have their own px/em sizes on p, h1, etc. which are
    // more specific than body % and therefore override it. This is why the
    // font-size slider appeared to do nothing (same bug seen in many EPUB readers).
    return `
        body {
            background: ${t.background} !important;
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            margin: 0;
        }
        body, p, div, span, h1, h2, h3, h4, h5, h6,
        li, blockquote, td, th, caption, pre, code, a {
            font-size: ${s.fontSize}% !important;
        }
        p, li, blockquote, td, th {
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            background: transparent !important;
        }
        h1, h2, h3, h4, h5, h6 {
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            background: transparent !important;
        }
        a { color: inherit !important; background: transparent !important; }
        div, span { color: ${t.color} !important; background: transparent !important; }
        ::selection { background: rgba(255,215,0,0.35) !important; }
    `;
};


/**
 * Manages the Foliate viewer lifecycle: open, relocate, load-with-styles, annotations.
 * Also applies live style updates when settings change.
 */
export const useFoliate = ({
    book,
    settings,
    viewerRef,
    setLocation,
    setToc,
    setIsReady,
    setLoadError,
    setSelection,
    setShowControls,
    setShowAppearance,
    setShowToc,
    setShowSettings,
    setShowNotes,
    setShowFocusExit,
    isFocusModeRef,
    recordPage,
}) => {
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // Open + wire Foliate events
    useEffect(() => {
        if (!book || !viewerRef.current) return;
        const view = viewerRef.current;

        const initBook = async () => {
            try {
                let fileToOpen = book.file;
                
                // Fallback: If it's stored in the new ArrayBuffer format but wasn't reconstructed upstream
                if (book.fileData && book.fileData.buffer) {
                    fileToOpen = new File([book.fileData.buffer], book.fileData.name || (book.title + '.epub'), { type: book.fileData.type });
                }
                
                // On iOS standalone mode, Blob URLs in iframes can be flaky.
                // We ensure we have a File/Blob with proper name and type.
                if (!(fileToOpen instanceof Blob)) {
                    const format = book.format || 'epub';
                    const ext  = format === 'pdf' ? '.pdf' : '.epub';
                    const mime = format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
                    fileToOpen = new File([fileToOpen], (book.title || 'book') + ext, { type: mime });
                }

                // In iOS PWA, sometimes the file handle is lost. We try to read it now as a preemptive check.
                console.log('Accessing book buffer for iOS stability...');
                try {
                    await fileToOpen.arrayBuffer();
                } catch (readErr) {
                    console.error('CRITICAL: Failed to read book buffer on iOS:', readErr);
                    throw new Error('Could not access book data (Safari storage limit or stale handle)');
                }

                console.log('Opening book:', fileToOpen.name, 'size:', fileToOpen.size);
                await view.open(fileToOpen);

                // --- PATCH FOR IOS STABILITY ---
                // Delay section unloading to prevent "NotFoundError" on Safari/PWA 
                // when images/resources are still being rendered while a section is revoked.
                if (view.book?.sections) {
                    console.log('Applying delayed-unload patch to sections');
                    view.book.sections = view.book.sections.map(s => {
                        const originalUnload = s.unload;
                        return {
                            ...s,
                            unload: () => {
                                console.log('Delaying section unload for iOS stability (15s)...');
                                setTimeout(() => {
                                    try { originalUnload(); } catch (e) { console.warn('Delayed unload failed:', e); }
                                }, 15000); 
                            }
                        };
                    });
                    // Ensure renderer has the same patched section list
                    if (view.renderer) view.renderer.sections = view.book.sections;
                }
                // -------------------------------

                const startLocation = book.cfi || 0;
                console.log('Reader goTo startLocation:', startLocation);
                try {
                    await view.goTo(startLocation);
                } catch (goErr) {
                    console.warn('Initial goTo failed, retrying at index 0:', goErr);
                    await view.goTo(0);
                }

                const foliateBook = view.book;
                if (foliateBook) setToc(foliateBook.toc || []);
                setIsReady(true);
            } catch (err) {
                console.error('Foliate load error detail:', err);
                setLoadError(`Reader Error: ${err.message || 'Could not open book'}. (Check console for details)`);
            }
        };

        const handleRelocate = (e) => {
            const detail = e.detail;
            if (!detail) return;

            const sectionCurrent = detail.section?.current !== undefined
                ? detail.section.current + 1
                : (detail.index !== undefined ? detail.index + 1 : 1);
            const sectionTotal = detail.section?.total || view.book?.sections?.length || 1;

            setLocation({
                start: {
                    cfi: detail.cfi,
                    percentage: detail.fraction,
                    displayed: { page: sectionCurrent, total: sectionTotal },
                    tocItem: detail.tocItem,
                },
            });

            if (detail.cfi) updateProgress(book.id, detail.cfi);
            if (detail.index !== undefined) recordPage(detail.index);
        };

        const handleDrawAnnotation = (e) => {
            const { draw, annotation } = e.detail;
            draw(Overlayer.highlight, { color: annotation.color || 'yellow' });
        };

        const handleLoad = async (e) => {
            const { doc, index } = e.detail;
            const s = settingsRef.current;

            if (view.renderer?.setStyles) {
                view.renderer.setStyles(buildReaderCSS(s));
                view.renderer.setAttribute('margin', '20px');
                view.renderer.setAttribute('max-inline-size', s.maxWidth === '100%' ? '1200px' : s.maxWidth);
                view.renderer.setAttribute('flow', s.flow);
                view.style.setProperty('color-scheme', s.theme === 'dark' ? 'dark' : 'light');
            }

            // Re-apply saved highlights for this section
            try {
                const savedHighlights = await getHighlights(book.id);
                if (savedHighlights?.length) {
                    for (const hl of savedHighlights) {
                        if (!hl.cfiRange) continue;
                        view.addAnnotation({ value: hl.cfiRange, color: hl.color || 'yellow' }).catch(() => {});
                    }
                }
            } catch (err) { console.warn('Could not load highlights', err); }

            doc.addEventListener('selectionchange', () => {
                const sel = doc.getSelection();
                const word = sel.toString().trim();
                if (word) {
                    try {
                        const range = sel.getRangeAt(0);
                        setSelection({ word, cfiRange: view.getCFI(index, range) });
                    } catch (_) {
                        setSelection({ word, cfiRange: null });
                    }
                } else {
                    setSelection(null);
                }
            });

            doc.addEventListener('click', (ev) => {
                const sel = doc.getSelection();
                if (sel?.toString().trim().length > 0) return;
                if (ev.target.closest('a') || ev.target.tagName.toLowerCase() === 'img') return;

                if (isFocusModeRef.current) {
                    setShowFocusExit(prev => !prev);
                    return;
                }

                setShowControls(prev => {
                    if (prev) {
                        setShowAppearance(false);
                        setShowToc(false);
                        setShowSettings(false);
                        setShowNotes(false);
                    }
                    return !prev;
                });
            });
        };

        view.addEventListener('relocate', handleRelocate);
        view.addEventListener('draw-annotation', handleDrawAnnotation);
        view.addEventListener('load', handleLoad);
        initBook();

        return () => {
            view.removeEventListener('relocate', handleRelocate);
            view.removeEventListener('draw-annotation', handleDrawAnnotation);
            view.removeEventListener('load', handleLoad);
            try { view.close?.(); } catch (_) {}
        };
    }, [book]); // <-- Flow removed from here to prevent full re-open on mode change

    // Live style + flow update when appearance/flow settings change
    useEffect(() => {
        const view = viewerRef.current;
        if (!view?.renderer?.setStyles) return;
        
        console.log('Applying live updates: theme, flow, max-width', theme, flow, maxWidth);
        
        // Update styles
        view.renderer.setStyles(buildReaderCSS(settings));
        
        // Update attributes on the renderer (paginator.js handles these dynamically)
        view.renderer.setAttribute('max-inline-size', maxWidth === '100%' ? '1200px' : maxWidth);
        view.renderer.setAttribute('flow', flow);
        
        // Update theme color scheme
        view.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');
    }, [theme, fontSize, fontFamily, lineHeight, maxWidth, flow]);
};
