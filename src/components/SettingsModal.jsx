import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAISettings, saveAISettings, PROVIDERS } from '../utils/ai';

const SettingsModal = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState('openrouter');
    const [model, setModel] = useState('');
    const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const settings = getAISettings();
        setApiKey(settings.apiKey || '');
        setProvider(settings.provider || 'openrouter');
        setOllamaBaseUrl(settings.ollamaBaseUrl || 'http://localhost:11434');

        const config = PROVIDERS.find((p) => p.id === (settings.provider || 'openrouter'));
        const defaultModel = config?.models?.[0] ?? '';
        setModel(settings.model || defaultModel);
    }, [isOpen]);

    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        const config = PROVIDERS.find((p) => p.id === newProvider);
        setModel(config?.models?.[0] ?? '');
    };

    const handleSave = () => {
        saveAISettings({ provider, model, apiKey, ollamaBaseUrl });
        setSaved(true);
        setTimeout(() => { setSaved(false); onClose(); }, 1200);
    };

    if (!isOpen) return null;

    const providerConfig = PROVIDERS.find((p) => p.id === provider);
    const modelOptions = providerConfig?.models ?? [];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 m-4"
                >
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-white">AI Settings</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Layers size={16} />
                                AI Provider
                            </label>
                            <select
                                value={provider}
                                onChange={(e) => handleProviderChange(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {PROVIDERS.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {provider !== 'ollama' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {modelOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-900 dark:text-blue-200">
                                    <strong>Model:</strong> Uses whatever model is currently running on your Ollama instance. Run <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">ollama serve model-name</code> to change it.
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                    Available models: llama3.2, llama3.1, mistral, gemma3, phi4, and more
                                </p>
                            </div>
                        )}

                        {providerConfig?.requiresApiKey && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <Key size={16} />
                                    {providerConfig.apiKeyLabel}
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your API key"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {providerConfig.apiKeyHelp}{' '}
                                    <a
                                        href={providerConfig.apiKeyHelpUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Learn more
                                    </a>
                                </p>
                            </div>
                        )}

                        {providerConfig?.requiresBaseUrl && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Ollama Base URL
                                </label>
                                <input
                                    type="text"
                                    value={ollamaBaseUrl}
                                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                                    placeholder="http://localhost:11434"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    {providerConfig.apiKeyHelp}{' '}
                                    <a
                                        href={providerConfig.apiKeyHelpUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Learn more
                                    </a>
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                                saved ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {saved ? <>Saved!</> : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SettingsModal;
