import React, { useState, useEffect } from 'react';
import { getBooks } from '../utils/storage';
import { getStreakData } from '../utils/streaks';
import { ArrowLeft, BookOpen, Clock, Flame, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = ({ onBack }) => {
    const [stats, setStats] = useState({
        totalBooks: 0,
        totalPages: 0,
        totalDurationMs: 0,
        streakData: { currentStreak: 0, maxStreak: 0, readToday: false }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            const books = await getBooks();
            const streakData = getStreakData();

            let totalPages = 0;
            let totalDurationMs = 0;

            books.forEach(book => {
                // Both types have sessions with duration
                if (book.sessions) {
                    book.sessions.forEach(session => {
                        totalDurationMs += (session.durationMs || 0);
                        // For ebooks, we use the session delta to count pages turned
                        if (book.type !== 'physical') {
                            totalPages += (session.pagesRead || 0);
                        }
                    });
                }

                if (book.type === 'physical') {
                    // Physical books track absolute pages via currentPage
                    totalPages += (book.currentPage || 0);
                }
            });

            setStats({
                totalBooks: books.length,
                totalPages,
                totalDurationMs,
                streakData
            });
            setLoading(false);
        };

        loadStats();
    }, []);

    const formatDuration = (ms) => {
        if (ms === 0) return "0 hrs";
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center overflow-y-auto">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const { totalBooks, totalPages, totalDurationMs, streakData } = stats;

    return (
        <div className="p-4 md:p-10 w-full max-w-7xl mx-auto flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <header className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-10">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Reading Insights</h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
                {/* Streak Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0 }}
                    className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-500/20"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Flame size={24} className="text-white" />
                        </div>
                        <span className="text-orange-100 text-sm font-medium border border-orange-400/30 px-2 py-1 rounded-full bg-white/10">
                            Max: {streakData.maxStreak}
                        </span>
                    </div>
                    <div>
                        <div className="text-4xl font-bold mb-1">{streakData.currentStreak} Days</div>
                        <div className="text-orange-100 font-medium">Current Reading Streak</div>
                    </div>
                </motion.div>

                {/* Duration Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {formatDuration(totalDurationMs)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 font-medium">Total Time Read</div>
                    </div>
                </motion.div>



                {/* Books Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            {totalBooks}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 font-medium">Books in Library</div>
                    </div>
                </motion.div>
            </div>


        </div>
    );
};

export default Dashboard;
