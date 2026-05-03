import { loadTodayNews } from '@/lib/newsLoader';
import ChatDemoClient from './ChatDemoClient';

export default async function ChatDemoPage() {
  const newsResult = await loadTodayNews();
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Today's News
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-powered summaries with text-to-speech
          </p>
        </header>
        
        {newsResult.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading News
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {newsResult.error}
            </p>
          </div>
        ) : (
          <ChatDemoClient initialStories={newsResult.stories} />
        )}
      </div>
    </main>
  );
}
