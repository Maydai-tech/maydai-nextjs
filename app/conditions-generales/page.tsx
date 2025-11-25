import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { getMarkdownContent } from '@/lib/markdown-utils';

export default function ConditionsGeneralesPage() {
  const { content } = getMarkdownContent('conditions-generales', 'legal');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8 py-16">
          <MarkdownRenderer content={content} />
        </div>
      </main>
      <Footer />
    </>
  );
} 