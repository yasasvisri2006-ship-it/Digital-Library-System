import { BookOpen } from 'lucide-react';

export default function LoadingPage() {
  return (
    <main className="loading-page">
      <div className="loading-mark"><BookOpen size={21} /></div>
      <span className="loading-spinner" aria-hidden="true" />
      <h1>Opening your learning space</h1>
      <p>Just a moment while everything settles in.</p>
    </main>
  );
}
