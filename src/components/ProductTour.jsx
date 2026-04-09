import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const ProductTour = ({ run, onComplete }) => {
    const [steps] = useState([
        {
            target: '#upload-btn',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Add your Books</h3>
                    <p className="text-sm">Upload your favorite EPUBs and PDFs here. They'll be saved locally and sync across your reading sessions!</p>
                </div>
            ),
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#physical-btn',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Physical Books</h3>
                    <p className="text-sm">Reading a real paperback? Add it here so you can still track your reading sessions and maintain your streak.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#settings-btn',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">AI Superpowers</h3>
                    <p className="text-sm">Add your Gemini API key here to unlock magical features like book summaries, explanations, and the Recall Engine.</p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '#streak-btn',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Track Your Habit</h3>
                    <p className="text-sm">Check your reading stats, daily streaks, and past sessions here. Build a lasting reading habit!</p>
                </div>
            ),
            placement: 'bottom',
        }
    ]);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            onComplete();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous={true}
            scrollToFirstStep={true}
            showProgress={true}
            showSkipButton={true}
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#2563eb', // blue-600
                    zIndex: 10000,
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    textColor: '#1f2937', // gray-800
                },
                tooltipContainer: {
                    textAlign: 'left'
                },
                buttonNext: {
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: 600
                },
                buttonBack: {
                    color: '#6b7280', // gray-500
                    marginRight: 10
                },
                buttonSkip: {
                    color: '#6b7280', // gray-500
                    fontSize: '14px'
                }
            }}
        />
    );
};

export default ProductTour;
