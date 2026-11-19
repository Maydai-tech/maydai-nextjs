'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQ_ENVIRONNEMENT_ITEMS } from '../faq-environnement-items'

export default function FaqEnvironnement() {
  const [openId, setOpenId] = useState<string | null>('acv')

  return (
    <section
      id="faq-impact-environnemental"
      className="py-16 md:py-24 px-5 sm:px-6 bg-white border-t border-gray-100"
      aria-labelledby="faq-impact-environnemental-heading"
    >
      <div className="max-w-3xl mx-auto">
        <h2
          id="faq-impact-environnemental-heading"
          className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-10 md:mb-12 leading-tight"
        >
          FAQ : Impact Environnemental IA, empreinte carbone et Green IT
        </h2>
        <div className="space-y-3">
          {FAQ_ENVIRONNEMENT_ITEMS.map(({ id, question, answer }) => {
            const isOpen = openId === id
            return (
              <div
                key={id}
                className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden shadow-sm"
              >
                <h3 className="m-0 w-full text-base font-normal">
                  <button
                    type="button"
                    id={`faq-environnement-trigger-${id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-environnement-panel-${id}`}
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
                  id={`faq-environnement-panel-${id}`}
                  role="region"
                  aria-labelledby={`faq-environnement-trigger-${id}`}
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
