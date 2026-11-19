import {
  buildSupportFaqPageJsonLd,
  getSupportFaqSections,
  type SupportFAQRole,
} from '@/components/support/support-faq-data'

type SupportFAQStructuredDataProps = {
  role: SupportFAQRole
}

/**
 * Composant Server pour générer les données structurées JSON-LD FAQPage.
 * Source unique : support-faq-data.ts (aligné sur le rendu SupportFAQ).
 * @see https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */
export default function SupportFAQStructuredData({ role }: SupportFAQStructuredDataProps) {
  const jsonLd = buildSupportFaqPageJsonLd(getSupportFaqSections(role))

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
