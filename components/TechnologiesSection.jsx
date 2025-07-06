'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';

export default function TechnologiesSection() {
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      const scrollWidth = scrollContainer.scrollWidth;
      const clientWidth = scrollContainer.clientWidth;
      
      let scrollPosition = 0;
      const scroll = () => {
        scrollPosition += 1;
        if (scrollPosition >= scrollWidth - clientWidth) {
          scrollPosition = 0;
        }
        scrollContainer.scrollLeft = scrollPosition;
      };
      
      const interval = setInterval(scroll, 50);
      return () => clearInterval(interval);
    }
  }, []);

  const logos = [
    {
      src: '/logos/logo-institut/eu_ai_act_logo_main.png',
      alt: 'EU AI Act'
    },
    {
      src: '/logos/logo-institut/6690f6497582bb8f9d6600dd_ia-for-.png',
      alt: 'IA for Good'
    },
    {
      src: '/logos/logo-institut/ai-forensics.png',
      alt: 'AI Forensics'
    },
    {
      src: '/logos/logo-institut/compl---ai.png',
      alt: 'Compl AI'
    },
    {
      src: '/logos/logo-institut/eth.png',
      alt: 'ETH Zurich'
    },
    {
      src: '/logos/logo-institut/logo-part1-en-green.png',
      alt: 'Partner Logo'
    },
    {
      src: '/logos/logo-institut/small_partner_DFF_30d5862b03.webp',
      alt: 'DFF Partner'
    },
    {
      src: '/logos/logo-institut/small_partner_NGI_e217d8aa57.webp',
      alt: 'NGI Partner',
      width: 128,
      height: 64
    },

    {
      src: '/logos/logo-institut/channels4_profile.jpg',
      alt: 'YouTube Channel',
      width: 120,
      height: 64
    },
    {
      src: '/logos/logo-institut/Espérance et algorithme.jpg',
      alt: 'Espérance et algorithme'
    }
  ];

  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: '#0080a3' }}>
          Façonner l'IA en Europe : <br />
          Nos Engagements pour une Technologie à Visage Humain.
        </h2>
        
        <div className="relative overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex space-x-12 overflow-x-hidden"
            style={{ 
              width: 'fit-content',
              animation: 'scroll 30s linear infinite'
            }}
          >
            {/* Première série de logos */}
            {logos.map((logo, index) => (
              <div key={index} className="flex-shrink-0">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width || 140}
                  height={logo.height || 64}
                  className="h-12 md:h-16 w-auto max-w-[120px] md:max-w-[140px] object-contain filter grayscale opacity-60 hover:opacity-90 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
            {/* Duplication pour un défilement continu */}
            {logos.map((logo, index) => (
              <div key={`duplicate-${index}`} className="flex-shrink-0">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width || 140}
                  height={logo.height || 64}
                  className="h-12 md:h-16 w-auto max-w-[120px] md:max-w-[140px] object-contain filter grayscale opacity-60 hover:opacity-90 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
} 