import React, { useState } from 'react';
import Library from './components/Library';
import Reader from './components/Reader';
import PdfViewer from './components/PdfViewer';
import ReadingTimer from './components/ReadingTimer';
import { getBook } from './utils/storage';
import Dashboard from './components/Dashboard';

function App() {
  const [currentBook, setCurrentBook] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenBook = async (book) => {
    setIsLoading(true);
    try {
      // Re-fetch to get fresh File/Blob handles for iOS PWA stability
      const freshBook = await getBook(book.id);
      const bookToOpen = freshBook || book;

      // Reconstruct File from ArrayBuffer if stored in the new format
      if (bookToOpen.fileData && bookToOpen.fileData.buffer) {
        bookToOpen.file = new File(
          [bookToOpen.fileData.buffer],
          bookToOpen.fileData.name || (bookToOpen.title + (bookToOpen.format === 'pdf' ? '.pdf' : '.epub')),
          { type: bookToOpen.fileData.type }
        );
      }

      setCurrentBook(bookToOpen);
    } catch (err) {
      console.error('Failed to refresh book data:', err);
      setCurrentBook(book);
    } finally {
      setIsLoading(false);
    }
  };

  const isFullScreen = (currentBook !== null) && !showDashboard;

  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col w-full bg-gray-50 dark:bg-gray-900 transition-colors"
      style={isFullScreen ? {} : {
        paddingTop: 'var(--safe-pt)',
        paddingBottom: 'var(--safe-pb)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : currentBook ? (
        currentBook.type === 'physical' ? (
          <ReadingTimer
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        ) : currentBook.format === 'pdf' ? (
          <PdfViewer
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        ) : (
          <Reader
            book={currentBook}
            onBack={() => setCurrentBook(null)}
          />
        )
      ) : (
        <Library
          onOpenBook={handleOpenBook}
          onOpenDashboard={() => setShowDashboard(true)}
        />
      )}
    </div>
  );
}

export default App;
