import { openDB } from 'idb';
import { recordReadingDay } from './streaks';

const DB_NAME = 'book-reader-db';
const STORE_NAME = 'books';
const CP_STORE = 'commonplace'; // Commonplace Book entries

export const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      }
      if (oldVersion < 2) {
        // New Commonplace Book store — each entry is a standalone idea/highlight
        if (!db.objectStoreNames.contains(CP_STORE)) {
          const store = db.createObjectStore(CP_STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('bookId', 'bookId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    },
  });
};

export const saveBook = async (book) => {
  const db = await initDB();
  return db.put(STORE_NAME, book);
};

export const getBooks = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const getBook = async (id) => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const updateProgress = async (id, cfi) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    book.cfi = cfi;
    book.lastRead = Date.now();
    await db.put(STORE_NAME, book);
    recordReadingDay(); // <---- Record Streak
  }
};

export const updatePhysicalProgress = async (id, pagesRead, sessionDurationMs, newCurrentPage) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book && book.type === 'physical') {
    book.currentPage = newCurrentPage;
    book.lastRead = Date.now();
    
    if (!book.sessions) book.sessions = [];
    book.sessions.push({
      date: Date.now(),
      pagesRead: pagesRead,
      durationMs: sessionDurationMs
    });
    
    await db.put(STORE_NAME, book);
    recordReadingDay(); 
  }
};

export const saveEbookSession = async (id, pagesRead, sessionDurationMs, lastPage) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book && book.type !== 'physical') {
    if (!book.sessions) book.sessions = [];
    book.sessions.push({
      date: Date.now(),
      pagesRead: pagesRead,
      durationMs: sessionDurationMs
    });
    
    if (lastPage) {
       book.currentPage = Math.max(book.currentPage || 0, lastPage);
    }
    
    await db.put(STORE_NAME, book);
    recordReadingDay();
  }
};

export const deleteBook = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};

export const saveHighlight = async (bookId, cfiRange, text, color = 'yellow', note = '') => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book) {
    if (!book.highlights) book.highlights = [];
    book.highlights.push({ cfiRange, text, color, note, timestamp: Date.now() });
    await db.put(STORE_NAME, book);
  }
};

export const getHighlights = async (bookId) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  return book ? (book.highlights || []) : [];
};

export const deleteHighlight = async (bookId, cfiRange) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book && book.highlights) {
    book.highlights = book.highlights.filter(h => h.cfiRange !== cfiRange);
    await db.put(STORE_NAME, book);
  }
};

export const saveSummary = async (bookId, chapterName, text) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book) {
    if (!book.summaries) book.summaries = [];
    book.summaries.push({ chapterName, text, timestamp: Date.now() });
    await db.put(STORE_NAME, book);
  }
};

export const getSummaries = async (bookId) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  return book ? (book.summaries || []) : [];
};

export const deleteSummary = async (bookId, timestamp) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book && book.summaries) {
    book.summaries = book.summaries.filter(s => s.timestamp !== timestamp);
    await db.put(STORE_NAME, book);
  }
};

// ── Genre / Curiosity Nudge ───────────────────────────────────────────────────

/** Sets the genre of a book ('fiction' | 'nonfiction'). */
export const setBookGenre = async (bookId, genre) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book) {
    book.genre = genre;
    await db.put(STORE_NAME, book);
  }
};

/** Saves a new pre-session prediction / learning intention. */
export const savePrediction = async (bookId, text, genre) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book) {
    if (!book.predictions) book.predictions = [];
    book.predictions.push({ text, genre, outcome: null, timestamp: Date.now() });
    await db.put(STORE_NAME, book);
  }
};

/** Returns all predictions for a book. */
export const getPredictions = async (bookId) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  return book ? (book.predictions || []) : [];
};

/** Updates the outcome of the most-recent open prediction. */
export const updatePredictionOutcome = async (bookId, timestamp, outcome) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book && book.predictions) {
    book.predictions = book.predictions.map(p =>
      p.timestamp === timestamp ? { ...p, outcome } : p
    );
    await db.put(STORE_NAME, book);
  }
};

/** Deletes a prediction by timestamp. */
export const deletePrediction = async (bookId, timestamp) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, bookId);
  if (book && book.predictions) {
    book.predictions = book.predictions.filter(p => p.timestamp !== timestamp);
    await db.put(STORE_NAME, book);
  }
};

// ── Commonplace Book ──────────────────────────────────────────────────────────
// Each Entry: { id (auto), bookId, bookTitle, bookAuthor, quote, myNote, tags[], chapter, cfi, timestamp }

/**
 * Save a new Commonplace Book entry.
 * bookTitle + bookAuthor are stored inline so entries survive book deletion.
 */
export const saveEntry = async ({ bookId, bookTitle, bookAuthor, quote, myNote = '', tags = [], chapter = '', cfi = null }) => {
  const db = await initDB();
  return db.add(CP_STORE, {
    bookId,
    bookTitle: bookTitle || 'Unknown Book',
    bookAuthor: bookAuthor || 'Unknown Author',
    quote,
    myNote,
    tags,
    chapter,
    cfi,
    timestamp: Date.now(),
  });
};

/** Get ALL entries across all books, newest first. */
export const getAllEntries = async () => {
  const db = await initDB();
  const all = await db.getAll(CP_STORE);
  return all.sort((a, b) => b.timestamp - a.timestamp);
};

/** Get entries for a specific book. */
export const getEntriesByBook = async (bookId) => {
  const db = await initDB();
  const all = await db.getAllFromIndex(CP_STORE, 'bookId', bookId);
  return all.sort((a, b) => b.timestamp - a.timestamp);
};

/** Update an entry (e.g. after editing myNote or tags). */
export const updateEntry = async (entry) => {
  const db = await initDB();
  return db.put(CP_STORE, entry);
};

/** Delete an entry by its auto-incremented id. */
export const deleteEntry = async (id) => {
  const db = await initDB();
  return db.delete(CP_STORE, id);
};

