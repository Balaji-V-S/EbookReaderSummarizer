# Dual Mode Book Tracker & Summarizer

Welcome to the **Dual Mode Book Tracker & Summarizer**, a visually stunning, mobile-first React application that helps you track both your physical books and EPUB e-books in one unified dashboard, and generates AI-powered summaries of your progress using the Gemini API!

## 🌟 Key Features

### 📖 Dual Reading Modes
- **E-Book Mode:** Upload any `.epub` file directly to the app. An offline-first reader renders the book locally using `epubjs` with full pagination, custom theming, text-scaling, and a Table of Contents sidebar. Your reading progress, duration, and page turns are tracked entirely automatically.
- **Physical Book Mode:** Log your physical library via ISBN search (fetching metadata from Open Library API) or add books manually. Use the built-in stopwatch timer to track your reading sessions and manually log your new page number when you finish.

### ✨ AI Chapter Summarizations
Powered by the **Google Gemini API**, you can instantly get a no-spoiler summary of the events leading up to your current reading position. 
- **E-Books:** Simply tap the Sparkles ✨ icon, and the app automatically determines your exact chapter and anchor text from the EPUB DOM to send to Gemini.
- **Physical:** Tap the Sparkles icon and enter the name or number of the chapter you just finished reading to get a pinpointed recap of your progress.

### 📊 Reading Analytics Dashboard
Your home base for tracking your reading velocity. It automatically merges progress from both physical and electronic formats to calculate:
- **Daily Reading Streaks:** Displays your current and all-time maximum consecutive reading days using localized storage.
- **Reading Speed:** Calculates your true "reading velocity" (Average Pages per Minute) across all formats based on your recorded reading sessions.
- **Total Metrics:** A high-level overview of hours spent reading, total pages turned, and books in your digital library.

### 📱 100% Mobile Responsive
The interface was rigorously designed to be flexible—utilizing fluid flexbox layouts, scalable typography, and modal clamping to ensure a flawless experience whether you are on a high-res desktop or a tiny mobile screen. 

## 🛠️ Technology Stack
- **Application Framework:** React 19 + Vite
- **Styling:** Tailwind CSS (v4)
- **Hardware Acceleration/Animations:** Framer Motion
- **Icons:** Lucide React
- **E-Book Parsing/Rendering:** ePub.js
- **Database:** IndexedDB (via `idb`) — enabling full offline storage of `ArrayBuffer` blobs!
- **AI Integration:** Google Gemini API
- **Observability:** OpenTelemetry (OTLP exporters configured)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Free tier)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Aprupshri/EbookReaderSummarizer.git
   cd EbookReaderSummarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the local address provided by Vite (usually `http://localhost:5173`).

### Configuration
Once the app is running, click the **Settings (Gear)** icon located in any reading view (Physical or E-Book) to enter your Gemini API Key safely into your `localStorage`.

## 💾 Offline Support Note
Because this app relies heavily on `IndexedDB`, uploaded EPUB files are stored safely inside your browser's local database. No backend server required! You do not need an internet connection to read your e-books, it is only required to fetch physical book metadata or generate AI summaries.

## 📄 License
This project is open-source. Feel free to fork, expand, and turn it into your ultimate reading companion!
