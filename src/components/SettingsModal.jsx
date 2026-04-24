import React, { useState, useEffect } from 'react';
import { X, Key, Save, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAISettings, saveAISettings } from '../utils/ai';

const OPENROUTER_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-mini',
  'mistral-7b',
];

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.0',
];

const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState('openrouter');
    const [model, setModel] = useState('gpt-4o-mini');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const settings = getAISettings();
        setApiKey(settings.apiKey || '');
        setProvider(settings.provider || 'openrouter');
        setModel(settings.model || (settings.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'));
    }, [isOpen]);

    const handleSave = () => {
        saveAISettings({ apiKey, provider, model });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!isOpen) return null;

    const modelOptions = provider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS;
    const apiLabel = provider === 'openrouter' ? 'OpenRouter API Key' : 'Google Gemini API Key';
    const apiHelpLink = provider === 'openrouter' ? 'https://openrouter.ai' : 'https://aistudio.google.com/app/apikey';
    const apiHelpText = provider === 'openrouter'
        ? 'Get your key from OpenRouter.'
        : 'Get one from Google AI Studio.';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col m-4"
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-white">Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Layers size={16} />
                                AI Provider
                            </label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="openrouter">OpenRouter</option>
                                <option value="gemini">Google Gemini</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {modelOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Key size={16} />
                                {apiLabel}
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your API key"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {apiHelpText} <a href={apiHelpLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Learn more</a>
                            </p>
                        </div>

                        <button
                            onClick={handleSave}
                            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${saved
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {saved ? (
                                <>Saved!</>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SettingsModal;
