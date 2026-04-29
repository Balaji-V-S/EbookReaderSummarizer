import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const ReaderTour = ({ run, onComplete }) => {
    const [steps] = useState([
        {
            target: '#tour-summarize',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">AI Summaries</h3>
                    <p className="text-sm">Lost track of the plot? Click here instantly get an AI-generated summary of exactly what happened in this chapter.</p>
                </div>
            ),
            disableBeacon: true,
            placement: 'bottom',
        },
        {
            target: '#tour-recall',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Recall Engine</h3>
                    <p className="text-sm">The Recall Engine uses active retrieval to strengthen your memory. It generates personalized questions based on what you've just read, helping you retain information longer and understand the book deeper.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-notes',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Your Notes & Highlights</h3>
                    <p className="text-sm">Review all the highlights you've made, read your saved notes, and jump right back to those specific sections in the book.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-focus',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Focus Mode</h3>
                    <p className="text-sm">Entering a deep reading session? Set a timer and block out distractions with Focus Mode.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#tour-toc',
            content: (
                <div>
                    <h3 className="font-bold text-lg mb-1">Navigation</h3>
                    <p className="text-sm">Open the Table of Contents, check your reading progress, or jump to specific chapters here.</p>
                </div>
            ),
            placement: 'top',
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
            scrollToFirstStep={false}
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

export default ReaderTour;
