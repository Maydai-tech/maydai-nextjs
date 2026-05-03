'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqItems = [
  {
    id: 'who',
    question: 'Qui doit obligatoirement réaliser un audit IA Act ?',
    answer:
      "Toute organisation (fournisseur ou utilisateur) déployant des systèmes d'IA sur le marché européen est concernée. L'audit est crucial pour déterminer votre rôle et vos obligations spécifiques.",
  },
  {
    id: 'criteria',
    question: "Quels sont les critères d'un système d'IA à Haut Risque ?",
    answer:
      'Le règlement cible notamment les systèmes impactant la sécurité, la santé ou les droits fondamentaux (recrutement, biométrie, infrastructures critiques). Notre outil automatise cette vérification pour vous.',
  },
  {
    id: 'duration',
    question: "Combien de temps prend l'audit sur MaydAI ?",
    answer:
      "L'évaluation initiale de vos cas d'usage se fait en quelques minutes. La plateforme vous guide ensuite pas à pas pour approfondir l'analyse selon la complexité de vos outils.",
  },
] as const

export default function FaqAudit() {
  const [openId, setOpenId] = useState<string | null>('who')

  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-10 md:mb-12 leading-tight">
          Questions fréquentes sur l&apos;Audit de l&apos;IA Act
        </h2>
        <div className="space-y-3">
          {faqItems.map(({ id, question, answer }) => {
            const isOpen = openId === id
            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  id={`faq-audit-trigger-${id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-audit-panel-${id}`}
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
                <div
                  id={`faq-audit-panel-${id}`}
                  role="region"
                  aria-labelledby={`faq-audit-trigger-${id}`}
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
