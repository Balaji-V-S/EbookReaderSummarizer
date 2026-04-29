import React from 'react';
import { X, AlignJustify, Scroll } from 'lucide-react';

const AppearanceMenu = ({
    showAppearance,
    setShowAppearance,
    theme,
    update,
    fontSize,
    fontFamily,
    lineHeight,
    flow
}) => {
    if (!showAppearance) return null;

    return (
        <div className={`absolute top-14 right-4 z-[60] w-72 p-4 rounded-xl shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-sm">Appearance</h3>
                <button onClick={() => setShowAppearance(false)}><X size={16} /></button>
            </div>

            {/* Theme */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">Theme</label>
                <div className={`flex gap-2 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                    {['light', 'sepia', 'dark'].map(t => (
                        <button
                            key={t}
                            onClick={() => update('theme', t)}
                            className={`flex-1 py-1.5 rounded-md text-xs capitalize transition-colors ${theme === t
                                ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Font Size */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">Font Size ({fontSize}%)</label>
                <div className="flex items-center gap-3">
                    <button onClick={() => update('fontSize', Math.max(50, fontSize - 10))} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : theme === 'sepia' ? 'hover:bg-[#e3dccb]' : 'hover:bg-gray-100'}`}>A-</button>
                    <input
                        type="range" min="50" max="200" value={fontSize}
                        onChange={(e) => update('fontSize', Number(e.target.value))}
                        className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${theme === 'dark' ? 'bg-gray-700' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-200'}`}
                    />
                    <button onClick={() => update('fontSize', Math.min(200, fontSize + 10))} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : theme === 'sepia' ? 'hover:bg-[#e3dccb]' : 'hover:bg-gray-100'}`}>A+</button>
                </div>
            </div>

            {/* Font Family */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">Font Family</label>
                <div className={`flex gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                    {[
                        { label: 'Sans', value: 'Inter, sans-serif' },
                        { label: 'Serif', value: 'Merriweather, serif' },
                        { label: 'Mono', value: 'monospace' }
                    ].map(f => (
                        <button
                            key={f.value}
                            onClick={() => update('fontFamily', f.value)}
                            style={{ fontFamily: f.value }}
                            className={`flex-1 py-1.5 rounded-md text-[11px] sm:text-xs transition-colors truncate px-1 ${fontFamily === f.value
                                ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Line Height */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-2 block">Line Height</label>
                <div className={`flex gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                    {[
                        { label: 'Compact', value: '1.4' },
                        { label: 'Normal', value: '1.8' },
                        { label: 'Loose', value: '2.2' }
                    ].map(lh => (
                        <button
                            key={lh.value}
                            onClick={() => update('lineHeight', lh.value)}
                            className={`flex-1 py-1.5 rounded-md text-xs transition-colors px-1 ${lineHeight === lh.value
                                ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                                : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                                }`}
                        >
                            {lh.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* View Mode */}
            <div>
                <label className="text-xs text-gray-500 mb-2 block">View Mode</label>
                <div className={`flex gap-2 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : theme === 'sepia' ? 'bg-[#e3dccb]' : 'bg-gray-100'}`}>
                    <button
                        onClick={() => update('flow', 'paginated')}
                        className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'paginated'
                            ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                            : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                            }`}
                    >
                        <AlignJustify size={14} /> Pages
                    </button>
                    <button
                        onClick={() => update('flow', 'scrolled')}
                        className={`flex-1 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${flow === 'scrolled'
                            ? (theme === 'dark' ? 'bg-gray-700 shadow-sm font-medium' : theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm font-medium' : 'bg-white shadow-sm font-medium')
                            : (theme === 'dark' ? 'hover:bg-gray-800' : theme === 'sepia' ? 'hover:bg-[#d6cebc]' : 'hover:bg-gray-200')
                            }`}
                    >
                        <Scroll size={14} /> Scroll
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppearanceMenu;
