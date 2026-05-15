import React from 'react';
import ReactDOM from 'react-dom/client';
import UploadForm from './components/UploadForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800">CronAi Aethel</h1>
          <p className="mt-2 text-gray-600">Emotion-driven video generation for solopreneurs and Web3 founders</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <UploadForm />
      </main>

      <footer className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500">
          &copy; {new Date().getFullYear()} CronAi Aethel. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);