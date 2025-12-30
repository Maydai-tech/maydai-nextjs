import { faqData } from '@/lib/constants/faqData';

/**
 * Composant Server pour générer les données structurées JSON-LD FAQPage
 * Optimisé pour les Rich Snippets Google
 * @see https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */
export default function FaqStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  );
}

