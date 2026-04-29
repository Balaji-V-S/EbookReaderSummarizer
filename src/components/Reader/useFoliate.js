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
            padding: 0 10px !important;
            margin: 0;
        }
        body, p, div, span, h1, h2, h3, h4, h5, h6,
        li, blockquote, td, th, caption, pre, code, a {
            font-size: ${s.fontSize}% !important;
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
        }
        html, body {
            -webkit-user-select: text !important;
            user-select: text !important;
            -webkit-touch-callout: default !important;
        }
        img, svg, video, audio {
            -webkit-user-select: none !important;
            user-select: none !important;
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

            if (detail.cfi) updateProgress(book.id, detail.cfi, detail.fraction);
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

            let touchStart = null;
            let lastTouchMoveAt = 0;
            let lastTouchEndAt = 0;
            let lastSelectionAt = 0;
            let lastSelectionClearAt = 0;
            let lastHandledTouchTapAt = 0;
            let lastTouchMoved = false;
            let hadActiveSelection = false;
            const tapMoveTolerance = 10;
            const gestureSettleMs = 350;
            const selectionSettleMs = 700;
            const longPressMs = 450;

            const getSelectedText = () => doc.getSelection()?.toString().trim() || '';

            const getTapTarget = (target) => {
                if (!target) return null;
                return typeof target.closest === 'function' ? target : target.parentElement;
            };

            const handleReaderTap = () => {
                if (isFocusModeRef.current) {
                    setShowFocusExit(prev => !prev);
                    return;
                }

                setShowAppearance(false);
                setShowToc(false);
                setShowSettings(false);
                setShowNotes(false);
                setShowControls(prev => !prev);
            };

            const shouldHandleReaderTap = (ev, now = Date.now()) => {
                const target = getTapTarget(ev.target);
                const tag = target?.tagName?.toLowerCase?.();

                if (ev.defaultPrevented) return false;
                if (getSelectedText().length > 0) return false;
                if (now - lastSelectionAt < selectionSettleMs) return false;
                if (now - lastSelectionClearAt < gestureSettleMs) return false;
                if (lastTouchMoved && now - lastTouchEndAt < gestureSettleMs) return false;
                if (now - lastTouchMoveAt < gestureSettleMs) return false;
                if (target?.closest?.('a[href], button, input, textarea, select, [role="button"]')) return false;
                if (['img', 'svg', 'video', 'audio'].includes(tag)) return false;

                return true;
            };

            const handleTouchStart = (ev) => {
                const root = doc.documentElement;
                const touch = ev.changedTouches?.[0];
                if (!touch) return;
                lastTouchMoved = false;
                touchStart = {
                    x: touch.clientX,
                    y: touch.clientY,
                    t: Date.now(),
                    isBottom: Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2,
                    isTop: root.scrollTop <= 2
                };
            };

            const handleTouchMove = (ev) => {
                const touch = ev.changedTouches?.[0];
                if (!touch || !touchStart) return;
                const dx = Math.abs(touch.clientX - touchStart.x);
                const dy = Math.abs(touch.clientY - touchStart.y);
                if (dx > tapMoveTolerance || dy > tapMoveTolerance) {
                    lastTouchMoved = true;
                    lastTouchMoveAt = Date.now();
                }
            };

            const handleTouchEnd = (ev) => {
                const endedAt = Date.now();
                const wasLongPress = touchStart && endedAt - touchStart.t > longPressMs;
                lastTouchEndAt = endedAt;

                // --- Overscroll Auto-Advance Injection (Mobile/Touch) ---
                if (lastTouchMoved && touchStart) {
                    const root = doc.documentElement;
                    const isBottom = Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2;
                    const isTop = root.scrollTop <= 2;
                    
                    const touch = ev.changedTouches?.[0];
                    if (touch) {
                        const dy = touchStart.y - touch.clientY; // Positive = swiping UP (scrolling down page)
                        
                        // Increase swipe threshold to 80px to demand a "hard pull"
                        if (dy > 80 && isBottom && touchStart.isBottom) {
                            view.next();
                        } else if (dy < -80 && isTop && touchStart.isTop) {
                            view.prev();
                        }
                    }
                }
                // ---------------------------------------------------------

                if (lastTouchMoved || wasLongPress) return;

                setTimeout(() => {
                    const now = Date.now();
                    if (now - lastHandledTouchTapAt < 500) return;
                    if (!shouldHandleReaderTap(ev, now)) return;
                    lastHandledTouchTapAt = now;
                    handleReaderTap();
                }, 60);
            };

            doc.addEventListener('touchstart', handleTouchStart, { passive: true });
            doc.addEventListener('touchmove', handleTouchMove, { passive: true });
            doc.addEventListener('touchend', handleTouchEnd, { passive: true });

            // --- Overscroll Auto-Advance Injection (Desktop/Wheel) ---
            let arrivedAtBottomAt = 0;
            let arrivedAtTopAt = 0;
            let overscrollDownAmount = 0;
            let overscrollUpAmount = 0;
            let wheelDebounce = null;
            
            const MOMENTUM_IGNORE_MS = 600; // Ignore all wheel events for 600ms upon hitting the boundary
            const HARD_PULL_THRESHOLD = 150; // The px of wheel scrolling needed to trigger page turn

            doc.addEventListener('wheel', (ev) => {
                const root = doc.documentElement;
                const isBottom = Math.ceil(root.scrollTop + root.clientHeight) >= Math.floor(root.scrollHeight) - 2;
                const isTop = root.scrollTop <= 2;

                if (ev.deltaY > 0) { // Scrolling down
                    overscrollUpAmount = 0;
                    if (isBottom) {
                        if (arrivedAtBottomAt === 0) arrivedAtBottomAt = Date.now();
                        
                        // Ignore residual momentum completely
                        if (Date.now() - arrivedAtBottomAt > MOMENTUM_IGNORE_MS) {
                            overscrollDownAmount += ev.deltaY;
                            if (overscrollDownAmount > HARD_PULL_THRESHOLD) {
                                view.next();
                                overscrollDownAmount = 0;
                                arrivedAtBottomAt = 0;
                            }
                        }
                    } else {
                        arrivedAtBottomAt = 0;
                        overscrollDownAmount = 0;
                    }
                } else if (ev.deltaY < 0) { // Scrolling up
                    overscrollDownAmount = 0;
                    if (isTop) {
                        if (arrivedAtTopAt === 0) arrivedAtTopAt = Date.now();
                        
                        if (Date.now() - arrivedAtTopAt > MOMENTUM_IGNORE_MS) {
                            overscrollUpAmount += Math.abs(ev.deltaY);
                            if (overscrollUpAmount > HARD_PULL_THRESHOLD) {
                                view.prev();
                                overscrollUpAmount = 0;
                                arrivedAtTopAt = 0;
                            }
                        }
                    } else {
                        arrivedAtTopAt = 0;
                        overscrollUpAmount = 0;
                    }
                }

                // If user stops scrolling for 200ms, reset the pull tension so they must do it in one continuous motion
                clearTimeout(wheelDebounce);
                wheelDebounce = setTimeout(() => {
                    overscrollDownAmount = 0;
                    overscrollUpAmount = 0;
                }, 200);
            }, { passive: true });
            // ----------------------------------------------------------

            doc.addEventListener('selectionchange', () => {
                const sel = doc.getSelection();
                const word = sel?.toString().trim() || '';
                if (word) {
                    hadActiveSelection = true;
                    lastSelectionAt = Date.now();
                    try {
                        const range = sel.getRangeAt(0);
                        setSelection({ word, cfiRange: view.getCFI(index, range) });
                    } catch (_) {
                        setSelection({ word, cfiRange: null });
                    }
                } else {
                    if (hadActiveSelection) lastSelectionClearAt = Date.now();
                    hadActiveSelection = false;
                    setSelection(null);
                }
            });

            doc.addEventListener('click', (ev) => {
                const now = Date.now();
                if (now - lastHandledTouchTapAt < 500) return;
                if (!shouldHandleReaderTap(ev, now)) return;
                lastHandledTouchTapAt = now;
                handleReaderTap();
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
