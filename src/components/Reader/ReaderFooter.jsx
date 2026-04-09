import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

const ReaderFooter = ({
    showControls,
    isFocusMode,
    theme,
    location,
    toc,
    onMenuClick,
    onNavigate,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragPercent, setDragPercent] = useState(0);
    const lastHref = useRef(null);

    const actualPercent = location ? Math.round((location.start.percentage || 0) * 100) : 0;
    const displayPercent = isDragging ? Math.round(dragPercent) : actualPercent;

    // Sync slider with actual progress when not dragging
    useEffect(() => {
        if (!isDragging) setDragPercent(actualPercent);
    }, [actualPercent, isDragging]);

    const navigateToPercent = (pct) => {
        if (!onNavigate) return;
        const fraction = Math.max(0, Math.min(1, pct / 100));

        // Only navigate if the value is meaningfully different
        const rounded = Math.round(fraction * 1000) / 1000;
        if (lastHref.current !== rounded) {
            lastHref.current = rounded;
            onNavigate({ fraction: rounded });
        }
    };

    const handleRelease = () => {
        if (isDragging) {
            setIsDragging(false);
            navigateToPercent(dragPercent);
        }
    };

    const trackBg = theme === 'dark' ? '#374151' : theme === 'sepia' ? '#e3dccb' : '#e5e7eb';

    return (
        <div
            className={`absolute left-0 right-0 bottom-0 px-4 py-3 z-50 flex flex-col gap-2 transition-transform duration-300 ${showControls && !isFocusMode ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                } ${theme === 'dark' ? 'bg-gray-900/95 text-gray-400' :
                    theme === 'sepia' ? 'bg-[#f4ecd8]/95 text-[#5b4636]/70' :
                        'bg-white/95 text-gray-500'
                }`}
        >
            {location ? (
                <>
                    {/* Chapter label */}
                    <div className="text-xs text-center opacity-70 w-full truncate px-4">
                        {location.start.tocItem?.label || ''}
                    </div>

                    {/* Bottom row: Menu, Slider, % */}
                    <div className="flex items-center gap-4 w-full">
                        <button
                            id="tour-toc"
                            onClick={onMenuClick}
                            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                            aria-label="Table of Contents"
                        >
                            <Menu size={24} />
                        </button>

                        <div className="flex-1 flex items-center gap-2">
                            <button
                                onClick={() => onNavigate?.('prev')}
                                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Previous Chapter"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={displayPercent}
                                onPointerDown={() => setIsDragging(true)}
                                onChange={(e) => {
                                    setIsDragging(true);
                                    setDragPercent(parseFloat(e.target.value));
                                }}
                                onPointerUp={handleRelease}
                                onBlur={handleRelease}
                                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer outline-none"
                                style={{
                                    background: `linear-gradient(to right, #ec4899 ${displayPercent}%, ${trackBg} ${displayPercent}%)`,
                                    accentColor: '#ec4899',
                                }}
                            />

                            <button
                                onClick={() => onNavigate?.('next')}
                                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                title="Next Chapter"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="text-sm font-medium w-10 text-right select-none flex-shrink-0">
                            {displayPercent}%
                        </div>
                    </div>
                </>
            ) : (
                <span className="w-full text-center py-2">Loading...</span>
            )}
        </div>
    );
};

export default ReaderFooter;


