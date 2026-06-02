import { FiPhone, FiMail, FiMapPin, FiChevronDown } from 'react-icons/fi'
import Image from 'next/image'
import Header from '@/components/site-vitrine/Header'
import Footer from '@/components/site-vitrine/Footer'
import ContactForm from '@/components/contact/ContactForm'

const faqData = [
  {
    question: "Comment réaliser un test gratuit d'audit IA Act avec MaydAI ?",
    answer:
      "Il suffit de créer un compte sur notre plateforme. Nous offrons l'accès au plan Freemium pour votre premier registre et vos deux premiers cas d'usage, vous permettant ainsi d'effectuer une première analyse de conformité sans frais et à votre rythme.",
  },
  {
    question: 'Le premier registre de conformité est-il vraiment gratuit ?',
    answer:
      "Oui. MaydAI s'engage à rendre la conformité accessible. Votre inscription inclut la création gratuite de votre premier registre IA et l'analyse de plusieurs systèmes d'IA selon les critères de l'IA Act européen.",
  },
  {
    question: 'Puis-je contacter l\'équipe pour un accompagnement personnalisé ?',
    answer:
      'Absolument. Utilisez le formulaire ci-dessus ou contactez-nous directement par téléphone au 07 68 93 91 16 pour discuter de vos besoins spécifiques en gouvernance de l\'IA.',
  },
]

export default function ContactPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h1 className="mb-6 text-center text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                <span className="text-[#0080a3]">Contactez MaydAI pour la réalisation</span>
                <br />
                <span className="text-[#ffab5a]">de vos Audits IA Act</span>
              </h1>

              <p className="mx-auto mb-8 max-w-4xl text-lg leading-relaxed text-gray-700">
                Une question sur notre solution ou une demande de partenariat ? Notre équipe vous
                répond. Vous souhaitez tester la conformité de vos systèmes ? Accédez immédiatement
                à notre offre découverte.
              </p>
            </div>

            <div className="mb-12 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-2">
                <div className="hidden items-center justify-center bg-gray-100 p-4 lg:flex">
                  <Image
                    src="/screenshots/dashboard-conformite-ai-act-maydai.webp"
                    alt="Dashboard plateforme MaydAI - Évaluation des risques AI Act"
                    width={1200}
                    height={675}
                    priority
                    className="h-auto w-full rounded-xl border border-gray-100 object-cover shadow-2xl"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>

                <div className="flex flex-col justify-center p-8 lg:p-10">
                  <div className="w-full">
                    <ContactForm />
                  </div>

                  <p className="mt-4 text-center text-xs text-gray-500">
                    En nous contactant, vous acceptez notre{' '}
                    <a href="/politique-confidentialite" className="text-[#0080a3] hover:underline">
                      politique de confidentialité
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12 rounded-2xl border border-gray-100 bg-white p-8 shadow-xl lg:p-10">
              <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 lg:text-3xl">
                Nous Contacter Directement
              </h2>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0080a3]/10">
                      <FiPhone className="h-8 w-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Téléphone</h3>
                    <a
                      href="tel:+33768939116"
                      className="text-gray-600 transition-colors duration-200 hover:text-[#0080a3]"
                    >
                      07 68 93 91 16
                    </a>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0080a3]/10">
                      <FiMail className="h-8 w-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Email Contact</h3>
                    <a
                      href="mailto:contact@maydai.io"
                      className="text-gray-600 transition-colors duration-200 hover:text-[#0080a3]"
                    >
                      contact@maydai.io
                    </a>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex-shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#0080a3]/10">
                      <FiMapPin className="h-8 w-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Adresse</h3>
                    <address className="not-italic leading-relaxed text-gray-600">
                      MaydAI
                      <br />
                      Rue Erlanger
                      <br />
                      75016 Paris
                    </address>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl lg:p-10">
              <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 lg:text-3xl">
                Questions Fréquentes
              </h2>

              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <details
                    key={index}
                    className="group overflow-hidden rounded-lg border border-gray-200"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-6 py-4 transition-colors duration-200 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                      <span className="pr-4 font-semibold text-gray-900">{faq.question}</span>
                      <FiChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="bg-white px-6 py-4 text-gray-700">{faq.answer}</div>
                  </details>
                ))}
              </div>
            </div>

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faqData.map((faq) => ({
                    '@type': 'Question',
                    name: faq.question,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: faq.answer,
                    },
                  })),
                }),
              }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
