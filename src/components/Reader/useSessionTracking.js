import { useRef, useEffect } from 'react';
import { saveEbookSession } from '../../utils/storage';

/**
 * Tracks the current reading session (start time, pages read, furthest page).
 * Call `saveSession` when the user exits to persist results.
 */
export const useSessionTracking = () => {
    const sessionRef = useRef({
        startTime: Date.now(),
        lastActiveTime: Date.now(),
        totalActiveDurationMs: 0,
        startPage: null,
        lastPage: null,
        maxPageReached: 0,
        visitedPages: new Set()
    });

    const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

    const trackActivity = () => {
        const now = Date.now();
        const elapsed = now - sessionRef.current.lastActiveTime;

        if (elapsed < IDLE_TIMEOUT_MS) {
            sessionRef.current.totalActiveDurationMs += elapsed;
        } else if (elapsed >= IDLE_TIMEOUT_MS) {
            // User was probably idle since the last recorded activity.
            // Add a small flat amount (e.g., 1 minute) to represent the time it takes to lose focus.
            sessionRef.current.totalActiveDurationMs += 60 * 1000;
        }

        sessionRef.current.lastActiveTime = now;
    };

    const recordPage = (pageIndex) => {
        trackActivity();

        if (sessionRef.current.startPage === null) {
            sessionRef.current.startPage = pageIndex;
        }
        sessionRef.current.lastPage = pageIndex;
        sessionRef.current.maxPageReached = Math.max(sessionRef.current.maxPageReached, pageIndex);
        
        if (pageIndex !== undefined && pageIndex !== null) {
            sessionRef.current.visitedPages.add(pageIndex);
        }
    };

    useEffect(() => {
        // Track initial load
        trackActivity();

        let timeout;
        const throttledInteraction = () => {
            if (timeout) return;
            trackActivity();
            // Throttle events so we're not calculating constantly (e.g., max once every 10 seconds)
            timeout = setTimeout(() => { timeout = null; }, 10000); 
        };

        // Listen to global events for activity
        window.addEventListener('click', throttledInteraction);
        window.addEventListener('keydown', throttledInteraction);
        window.addEventListener('scroll', throttledInteraction);
        window.addEventListener('touchstart', throttledInteraction);

        return () => {
            window.removeEventListener('click', throttledInteraction);
            window.removeEventListener('keydown', throttledInteraction);
            window.removeEventListener('scroll', throttledInteraction);
            window.removeEventListener('touchstart', throttledInteraction);
            if (timeout) clearTimeout(timeout);
        };
    }, []);

    const saveSession = async (bookId) => {
        // Catch up any time elapsed since last activity before recording
        trackActivity();

        const { maxPageReached, visitedPages, totalActiveDurationMs } = sessionRef.current;
        const durationMs = totalActiveDurationMs;
        const pagesRead = visitedPages.size;

        if (durationMs > 5000 || pagesRead > 0) {
            try {
                await saveEbookSession(bookId, pagesRead, durationMs, maxPageReached);
            } catch (e) {
                console.warn('Could not save ebook session', e);
            }
        }
    };

    return { recordPage, saveSession, trackActivity };
};
