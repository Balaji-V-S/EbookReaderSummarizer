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

    return `
        body {
            background: ${t.background} !important;
            color: ${t.color} !important;
            font-family: ${s.fontFamily} !important;
            line-height: ${s.lineHeight} !important;
            font-size: ${s.fontSize}% !important;
            margin: 0;
            padding: 0;
        }
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
    showControlsRef,
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

        // ─── OUTER TAP HANDLER ───────────────────────────────────────────────────
        // THE ROOT FIX: Attach tap detection to the OUTER view element, NOT to the
        // inner iframe document.
        //
        // WHY THE OLD CODE BROKE:
        //   foliate-js paginates using CSS multicolumn inside an iframe. The iframe
        //   content is horizontally scrolled — on page 2 the scroll offset is
        //   ~screenWidth, on page 3 it's ~2*screenWidth, etc.
        //   So ev.clientX *inside* the iframe doc is NOT in 0→screenWidth range;
        //   it reflects the scrolled column position, which can be 800, 1600, etc.
        //   Comparing that against screenWidth * 0.25 / 0.75 was always wrong.
        //
        // WHY THE OUTER LISTENER WORKS:
        //   Pointer events on the outer view element (outside the iframe) are always
        //   in real screen space (0 → window.innerWidth), regardless of how the
        //   iframe content is internally scrolled. So left/right zones are correct
        //   on every page, every time.
        //
        // pointerOriginatedInView: lets the inner doc signal "cancel this tap"
        // (e.g. user selected text or tapped a link inside the iframe).
        let outerTapStartX = null;
        let outerTapStartY = null;
        let outerTapStartTime = 0;
        let pointerOriginatedInView = false;

        const handleOuterPointerDown = (ev) => {
            outerTapStartX = ev.clientX;
            outerTapStartY = ev.clientY;
            outerTapStartTime = Date.now();
            pointerOriginatedInView = true;
        };

        const handleOuterPointerUp = (ev) => {
            if (!pointerOriginatedInView || outerTapStartX === null) return;

            const dx = Math.abs(ev.clientX - outerTapStartX);
            const dy = Math.abs(ev.clientY - outerTapStartY);
            const dt = Date.now() - outerTapStartTime;

            outerTapStartX = null;
            pointerOriginatedInView = false;

            // Only handle clean, short taps — not drags or long-presses
            if (dx > 10 || dy > 10 || dt >= 400) return;

            // If controls are visible, ANY tap on the screen should dismiss them.
            // Do not turn the page in this state.
            if (showControlsRef?.current) {
                setShowControls(false);
                setShowAppearance(false);
                setShowToc(false);
                setShowSettings(false);
                setShowNotes(false);
                return;
            }

            // ev.clientX is screen-space here, always 0 → window.innerWidth
            const screenW = window.innerWidth;

            if (settingsRef.current?.flow === 'paginated') {
                if (ev.clientX < screenW * 0.25) {
                    view.prev();
                    return;
                }
                if (ev.clientX > screenW * 0.75) {
                    view.next();
                    return;
                }
                // Middle 50% → fall through to toggle controls
            }

            if (isFocusModeRef.current) {
                setShowFocusExit(prev => !prev);
                return;
            }

            setShowControls(true);
        };

        const handleOuterPointerCancel = () => {
            outerTapStartX = null;
            pointerOriginatedInView = false;
        };

        view.addEventListener('pointerdown',   handleOuterPointerDown);
        view.addEventListener('pointerup',     handleOuterPointerUp);
        view.addEventListener('pointercancel', handleOuterPointerCancel);
        // ─────────────────────────────────────────────────────────────────────────

        const initBook = async () => {
            try {
                let fileToOpen = book.file;

                // Fallback: If stored in ArrayBuffer format but not reconstructed upstream
                if (book.fileData && book.fileData.buffer) {
                    fileToOpen = new File(
                        [book.fileData.buffer],
                        book.fileData.name || (book.title + '.epub'),
                        { type: book.fileData.type }
                    );
                }

                // On iOS standalone mode, Blob URLs in iframes can be flaky.
                if (!(fileToOpen instanceof Blob)) {
                    const format = book.format || 'epub';
                    const ext  = format === 'pdf' ? '.pdf' : '.epub';
                    const mime = format === 'pdf' ? 'application/pdf' : 'application/epub+zip';
                    fileToOpen = new File([fileToOpen], (book.title || 'book') + ext, { type: mime });
                }

                // Preemptive read check for iOS stability
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

            // Text selection — must listen on doc because getSelection() only
            // works inside the iframe document. Debounced 50ms so the outer
            // pointerup fires first and sees a clean selection state.
            let selectionTimeout = null;
            doc.addEventListener('selectionchange', () => {
                clearTimeout(selectionTimeout);
                selectionTimeout = setTimeout(() => {
                    const sel = doc.getSelection();
                    const word = sel?.toString().trim();
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
                }, 50);
            });

            let innerTapStartX = null;
            let innerTapStartY = null;
            let innerTapStartTime = 0;

            doc.addEventListener('pointerdown', (ev) => {
                innerTapStartX = ev.clientX;
                innerTapStartY = ev.clientY;
                innerTapStartTime = Date.now();
            }, { passive: true });

            // Inner doc pointerup: cancel the outer tap handler when the user
            // finishes a text-selection drag or taps a link/image inside the iframe.
            doc.addEventListener('pointerup', (ev) => {
                const sel = doc.getSelection();
                if (sel?.toString().trim().length > 0) {
                    // Text was selected — suppress the outer nav tap
                    pointerOriginatedInView = false;
                    return;
                }
                if (ev.target.closest('a') || ev.target.tagName.toLowerCase() === 'img') {
                    // Link or image tapped — suppress the outer nav tap
                    pointerOriginatedInView = false;
                    return;
                }

                if (innerTapStartX !== null) {
                    const dx = Math.abs(ev.clientX - innerTapStartX);
                    const dy = Math.abs(ev.clientY - innerTapStartY);
                    const dt = Date.now() - innerTapStartTime;

                    // Clean tap inside the text iframe
                    if (dx <= 10 && dy <= 10 && dt < 400) {
                        // If controls are visible, ANY tap on the text should dismiss them!
                        if (showControlsRef?.current) {
                            setShowControls(false);
                            setShowAppearance(false);
                            setShowToc(false);
                            setShowSettings(false);
                            setShowNotes(false);
                            pointerOriginatedInView = false;
                        } else if (!isFocusModeRef.current) {
                            // Optionally, if controls are hidden, tapping center could toggle them.
                            // But outer handler usually catches margins. If they tapped inner text, show them.
                            setShowControls(true);
                            pointerOriginatedInView = false;
                        }
                    }
                }
                innerTapStartX = null;
            });
        };

        view.addEventListener('relocate',         handleRelocate);
        view.addEventListener('draw-annotation',  handleDrawAnnotation);
        view.addEventListener('load',             handleLoad);
        initBook();

        return () => {
            view.removeEventListener('relocate',         handleRelocate);
            view.removeEventListener('draw-annotation',  handleDrawAnnotation);
            view.removeEventListener('load',             handleLoad);
            view.removeEventListener('pointerdown',      handleOuterPointerDown);
            view.removeEventListener('pointerup',        handleOuterPointerUp);
            view.removeEventListener('pointercancel',    handleOuterPointerCancel);
            try { view.close?.(); } catch (_) {}
        };
    }, [book]); // flow intentionally excluded to prevent full re-open on mode change

    // Live style + flow update when appearance/flow settings change
    useEffect(() => {
        const view = viewerRef.current;
        if (!view?.renderer?.setStyles) return;

        console.log('Applying live updates: theme, flow, max-width', theme, flow, maxWidth);

        view.renderer.setStyles(buildReaderCSS(settings));
        view.renderer.setAttribute('max-inline-size', maxWidth === '100%' ? '1200px' : maxWidth);
        view.renderer.setAttribute('flow', flow);
        view.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');
    }, [theme, fontSize, fontFamily, lineHeight, maxWidth, flow]);
};