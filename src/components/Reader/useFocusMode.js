import { useState, useRef, useEffect } from 'react';
import { playAmbience, stopAmbience } from '../../utils/audio';

/**
 * Manages Focus Mode state: timer countdown, ambience audio, and completion celebration.
 */
export const useFocusMode = ({ setShowControls }) => {
    const [showFocusSetup, setShowFocusSetup] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showFocusExit, setShowFocusExit] = useState(false);
    const [focusGoal, setFocusGoal] = useState(0);
    const [focusTimeRemaining, setFocusTimeRemaining] = useState(0);
    const [showFocusCelebration, setShowFocusCelebration] = useState(false);
    const focusTimerRef = useRef(null);
    // Ref so Foliate's click handler can read focus state without stale closure
    const isFocusModeRef = useRef(false);

    useEffect(() => {
        isFocusModeRef.current = isFocusMode;
    }, [isFocusMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (focusTimerRef.current) clearInterval(focusTimerRef.current);
            stopAmbience();
        };
    }, []);

    const handleFocusComplete = () => {
        setIsFocusMode(false);
        stopAmbience();
        setShowFocusCelebration(true);
        setTimeout(() => setShowFocusCelebration(false), 5000);
    };

    const handleStartFocus = ({ timerGoal, ambience }) => {
        setShowFocusSetup(false);
        setFocusGoal(timerGoal);
        setFocusTimeRemaining(timerGoal * 60);
        setIsFocusMode(true);
        setShowFocusExit(false);
        setShowControls(false);
        playAmbience(ambience);

        if (timerGoal > 0) {
            focusTimerRef.current = setInterval(() => {
                setFocusTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(focusTimerRef.current);
                        handleFocusComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const handleExitFocus = () => {
        if (focusTimerRef.current) clearInterval(focusTimerRef.current);
        stopAmbience();
        setIsFocusMode(false);
        setShowFocusExit(false);
    };

    return {
        showFocusSetup, setShowFocusSetup,
        isFocusMode, isFocusModeRef,
        showFocusExit, setShowFocusExit,
        focusGoal, focusTimeRemaining,
        showFocusCelebration,
        handleStartFocus, handleExitFocus,
    };
};
