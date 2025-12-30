'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { faqData } from '@/lib/constants/faqData';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto max-w-4xl">
        {/* En-tête de section */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center mb-4">
            <Image 
              src="/icons/chats.png" 
              alt="Chat" 
              width={64} 
              height={64} 
              className="w-16 h-16 mb-4" 
            />
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0080a3]">
              Questions Fréquentes
            </h2>
          </div>
          <p className="mt-3 text-lg text-gray-600">
            Tout ce que vous devez savoir sur MaydAI et la conformité AI Act
          </p>
        </div>

        {/* Liste des FAQ en accordéon */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div 
              key={index} 
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex justify-between items-center p-5 md:p-6 text-left font-semibold text-gray-800 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0080a3] focus:ring-inset"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="pr-4 text-base md:text-lg">{item.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 md:w-6 md:h-6 text-[#0080a3] flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
              <div 
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-question-${index}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

