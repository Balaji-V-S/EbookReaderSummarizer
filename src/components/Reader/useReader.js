import { useState, useRef } from 'react';
import { useReaderSettings } from '../../utils/useReaderSettings';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useEffect } from 'react';

import { useSessionTracking } from './useSessionTracking';
import { useFocusMode } from './useFocusMode';
import { useRecallEngine } from './useRecallEngine';
import { useSummary } from './useSummary';
import { useExplainSelection } from './useExplainSelection';
import { useFoliate } from './useFoliate';

/**
 * Top-level reader hook.  Composes all domain-specific sub-hooks and
 * wires shared state (viewerRef, location, UI visibility toggles) between them.
 */
export const useReader = ({ book, onBack }) => {
    const viewerRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [toc, setToc] = useState([]);

    // UI visibility toggles
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showAppearance, setShowAppearance] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    // Curiosity nudge
    const [showPrediction, setShowPrediction] = useState(false);
    const [showReflection, setShowReflection] = useState(false);
    const [sessionPrediction, setSessionPrediction] = useState(null);
    const [pendingBack, setPendingBack] = useState(false);

    // ── Appearance settings ────────────────────────────────────────────────
    const { settings, update } = useReaderSettings();
    const { theme, fontSize, fontFamily, lineHeight, maxWidth, flow } = settings;

    // ── Domain hooks ───────────────────────────────────────────────────────
    const { recordPage, saveSession } = useSessionTracking();

    const focus = useFocusMode({ setShowControls });

    const recall = useRecallEngine({ book, location, viewerRef, setShowSettings });

    const summary = useSummary({ book, location, viewerRef, setShowSettings });

    const explain = useExplainSelection({ book, location, viewerRef, setShowSettings });

    // Foliate viewer — needs refs and setters from all the other hooks
    useFoliate({
        book,
        settings,
        viewerRef,
        setLocation,
        setToc,
        setIsReady,
        setLoadError,
        setSelection: explain.setSelection,
        setShowControls,
        setShowAppearance,
        setShowToc,
        setShowSettings,
        setShowNotes,
        setShowFocusExit: focus.setShowFocusExit,
        isFocusModeRef: focus.isFocusModeRef,
        recordPage,
    });

    // ── Status Bar sync ────────────────────────────────────────────────────
    useEffect(() => {
        const toggle = async () => {
            try {
                if (focus.isFocusMode || !showControls) {
                    await StatusBar.hide();
                } else {
                    await StatusBar.show();
                    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
                }
            } catch (_) { /* no-op on web */ }
        };
        toggle();
        return () => { StatusBar.show().catch(() => {}); };
    }, [showControls, theme, focus.isFocusMode]);

    // ── Back handler ───────────────────────────────────────────────────────
    const handleBack = async () => {
        await saveSession(book.id);
        if (sessionPrediction) {
            setShowReflection(true);
        } else {
            onBack();
        }
    };

    return {
        // Viewer
        viewerRef, location, isReady, loadError, toc,

        // UI toggles
        showControls, setShowControls,
        showSettings, setShowSettings,
        showAppearance, setShowAppearance,
        showToc, setShowToc,
        showNotes, setShowNotes,

        // Curiosity nudge
        showPrediction, setShowPrediction,
        showReflection, setShowReflection,
        sessionPrediction, setSessionPrediction,
        pendingBack, setPendingBack,

        // Appearance
        settings, update, theme, fontSize, fontFamily, lineHeight, maxWidth, flow,

        // Domain handlers
        handleBack,
        handlePrev: () => viewerRef.current?.prev(),
        handleNext: () => viewerRef.current?.next(),

        // Summary
        ...summary,

        // Recall
        ...recall,

        // Explain & Selection
        ...explain,

        // Focus
        ...focus,
    };
};
