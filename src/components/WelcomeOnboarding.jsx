import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Upload, Sparkles, BarChart2, ChevronRight, Check } from 'lucide-react';

const slides = [
    {
        id: 'welcome',
        title: 'Welcome to ReadParty',
        description: 'Your beautiful, personalized reading companion. Track, read, and understand your books better than ever before.',
        icon: <BookOpen className="w-16 h-16 text-blue-500 mb-6" />,
        color: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
        id: 'library',
        title: 'Build Your Library',
        description: 'Upload your favorite EPUBs and PDFs to read seamlessly across devices, or add physical books to track your reading sessions.',
        icon: <Upload className="w-16 h-16 text-emerald-500 mb-6" />,
        color: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
        id: 'ai',
        title: 'AI Superpowers',
        description: 'Unlock incredible AI features with Gemini. Get chapter summaries, ask questions about what you\'ve read, and test your memory with the Recall Engine.',
        icon: <Sparkles className="w-16 h-16 text-amber-500 mb-6" />,
        color: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
        id: 'tracking',
        title: 'Track Your Progress',
        description: 'Build a reading habit. Track your active reading time and maintain your reading streaks every day. Let\'s get started!',
        icon: <BarChart2 className="w-16 h-16 text-indigo-500 mb-6" />,
        color: 'bg-indigo-50 dark:bg-indigo-900/20',
    }
];

const WelcomeOnboarding = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            finishOnboarding();
        }
    };

    const finishOnboarding = () => {
        localStorage.setItem('has_seen_onboarding', 'true');
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-gray-100 dark:border-gray-800"
            >
                {/* Slide Content */}
                <div className="relative h-80 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center ${slides[currentSlide].color}`}
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.4, type: "spring", bounce: 0.5 }}
                            >
                                {slides[currentSlide].icon}
                            </motion.div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                {slides[currentSlide].title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                {slides[currentSlide].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Area */}
                <div className="p-6 bg-white dark:bg-gray-900 flex flex-col gap-6">
                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2">
                        {slides.map((_, index) => (
                            <motion.div
                                key={index}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                        ? 'w-6 bg-blue-600 dark:bg-blue-500'
                                        : 'w-2 bg-gray-200 dark:bg-gray-700'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={nextSlide}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20"
                    >
                        {currentSlide === slides.length - 1 ? (
                            <>
                                Let's Read
                                <Check size={20} />
                            </>
                        ) : (
                            <>
                                Continue
                                <ChevronRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WelcomeOnboarding;
