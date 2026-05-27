'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqItems = [
  {
    id: 'what',
    question: "Qu'est-ce que la conformité IA Act et qui est concerné ?",
    answer:
      "La conformité IA Act désigne l'alignement obligatoire avec le règlement européen sur l'intelligence artificielle. Elle concerne tous les fournisseurs, déployeurs et distributeurs de systèmes IA opérant sur le marché européen, avec des exigences strictes pour les systèmes d'IA dits à 'Haut Risque'.",
  },
  {
    id: 'how',
    question: 'Comment vérifier la conformité AI Act de mes systèmes ?',
    answer:
      "L'évaluation passe par une cartographie rigoureuse de vos cas d'usage, un scoring précis de vos niveaux de risque, et la mise en place d'une gouvernance technique transparente. MaydAI automatise ce processus pour vous fournir une feuille de route claire.",
  },
  {
    id: 'sanctions',
    question:
      'Quelles sont les sanctions en cas de non-conformité à la réglementation IA ?',
    answer:
      "Le non-respect du règlement européen peut entraîner des sanctions financières lourdes allant jusqu'à 35 millions d'euros ou 7% du chiffre d'affaires mondial annuel, d'où l'importance d'anticiper la gouvernance de vos projets.",
  },
] as const

export default function FaqConformite() {
  const [openId, setOpenId] = useState<string | null>('what')

  return (
    <section
      id="faq-conformite"
      className="py-16 md:py-24 px-5 sm:px-6 bg-white border-t border-gray-100"
      aria-labelledby="faq-conformite-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="faq-conformite-heading"
          className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-10 md:mb-12 leading-tight"
        >
          Questions fréquentes sur la conformité IA Act
        </h2>
        <div className="space-y-3">
          {faqItems.map(({ id, question, answer }) => {
            const isOpen = openId === id
            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden shadow-sm"
              >
                <h3 className="m-0 w-full text-base font-normal">
                  <button
                    type="button"
                    id={`faq-conformite-trigger-${id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-conformite-panel-${id}`}
                    className="flex w-full items-center justify-between gap-4 text-left px-5 py-4 md:px-6 md:py-5 font-semibold text-gray-900 hover:bg-white/80 transition-colors"
                    onClick={() => setOpenId(isOpen ? null : id)}
                  >
                    <span className="text-sm sm:text-base pr-2">{question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#0080a3] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={`faq-conformite-panel-${id}`}
                  role="region"
                  aria-labelledby={`faq-conformite-trigger-${id}`}
                  className={`border-t border-gray-100 ${isOpen ? '' : 'hidden'}`}
                >
                  <div className="px-5 py-4 md:px-6 md:pb-5 text-gray-600 text-sm sm:text-base leading-relaxed">
                    {answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
