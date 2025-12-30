"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';
import { Server, Lock, Shield, ChevronDown } from 'lucide-react';

// Données des certifications
const certifications = [
  { src: '/icons_sec/ISOIEC_27001.webp', alt: 'ISO/IEC 27001 - Sécurité de l\'information', label: 'ISO 27001' },
  { src: '/icons_sec/Soc_1.webp', alt: 'SOC 1 Type II - Contrôles financiers', label: 'SOC 1' },
  { src: '/icons_sec/Soc_2.webp', alt: 'SOC 2 Type II - Contrôles de sécurité', label: 'SOC 2' },
  { src: '/icons_sec/RGPD_Certif.webp', alt: 'RGPD - Conformité européenne', label: 'RGPD' },
  { src: '/icons_sec/Webcloud_1.webp', alt: 'OVHcloud - Hébergeur européen', label: 'OVHcloud' },
  { src: '/icons_sec/FR_Hosting.webp', alt: 'Hébergé en France - Souveraineté des données', label: 'France' },
];

// Données des blocs principaux
const securityBlocks = [
  {
    icon: Server,
    title: 'Infrastructure Cloud 100% Européenne',
    description: 'Nous avons choisi OVHcloud, leader européen du Cloud, pour héberger l\'intégralité de la plateforme MaydAI.',
    features: [
      { title: 'Souveraineté des Données', text: 'Vos données sont stockées physiquement en France (Datacenters de Gravelines ou Roubaix). Elles ne transitent jamais par des serveurs soumis au Cloud Act américain.' },
      { title: 'Protection Anti-DDoS', text: 'Notre infrastructure bénéficie de la protection native d\'OVH contre les attaques par déni de service, garantissant la disponibilité de vos services 24/7.' },
      { title: 'Certifications de l\'Hébergeur', text: 'Nos serveurs répondent aux normes les plus strictes : ISO 27001, SOC 1 & 2 Type II.' },
    ],
  },
  {
    icon: Lock,
    title: 'Architecture Technique Cloisonnée',
    description: 'La sécurité est intégrée dès la conception de notre code ("Security by Design").',
    features: [
      { title: 'Isolation des Données', text: 'Vos informations clients sont stockées dans des bases de données isolées, strictement séparées du serveur d\'application via un réseau privé (vRack).' },
      { title: 'Chiffrement', text: 'Toutes les communications entre votre navigateur et MaydAI sont chiffrées (HTTPS/TLS 1.3). Vos données sensibles sont chiffrées au repos ("Encryption at Rest").' },
      { title: 'Sauvegardes Quotidiennes', text: 'Nous effectuons des backups automatiques quotidiens, répliqués sur plusieurs sites géographiques pour prévenir toute perte de données.' },
    ],
  },
  {
    icon: Shield,
    title: 'Respect total de vos données stratégiques',
    description: 'MaydAI applique strictement le Règlement Général sur la Protection des Données.',
    features: [
      { title: 'Conformité RGPD', text: 'MaydAI applique strictement le Règlement Général sur la Protection des Données, garantissant vos droits en tant qu\'utilisateur européen.' },
      { title: 'Propriété des Données', text: 'Vos données vous appartiennent. Vous pouvez à tout moment les exporter ou demander leur suppression intégrale de nos serveurs.' },
      { title: 'Pas d\'entraînement caché', text: 'Nous n\'utilisons pas vos données privées pour entraîner nos modèles d\'IA publics sans votre consentement explicite.' },
    ],
  },
];

// Données FAQ
const faqData = [
  {
    question: 'Où sont stockées mes données ?',
    answer: 'Vos données sont stockées exclusivement en France, dans les datacenters d\'OVHcloud situés à Gravelines et Roubaix. Ces centres de données bénéficient des certifications les plus strictes (ISO 27001, SOC 2 Type II) et sont soumis uniquement à la juridiction européenne. Vos données ne transitent jamais par des serveurs soumis au Cloud Act américain.',
  },
  {
    question: 'Mes données sont-elles utilisées pour entraîner des modèles IA ?',
    answer: 'Non. MaydAI s\'engage à ne jamais utiliser vos données confidentielles pour entraîner des modèles d\'intelligence artificielle sans votre consentement explicite. Vos informations stratégiques restent strictement privées et sont utilisées uniquement dans le cadre de votre utilisation de la plateforme.',
  },
  {
    question: 'Quelles certifications garantissent la sécurité de MaydAI ?',
    answer: 'MaydAI repose sur l\'infrastructure OVHcloud certifiée ISO/IEC 27001 (sécurité de l\'information), SOC 1 et SOC 2 Type II (contrôles de sécurité audités). Notre plateforme est également conforme au RGPD européen. Ces certifications sont régulièrement auditées par des organismes indépendants.',
  },
];

export default function SecuritePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-white text-gray-800">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 px-4 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0080a3]/5 via-white to-blue-50/50 -z-10" />
          
          <div className="container mx-auto max-w-5xl text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-[#0080a3]/10 rounded-2xl">
                <Shield className="w-12 h-12 md:w-16 md:h-16 text-[#0080a3]" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
              Vos données, notre priorité absolue :{' '}
              <span className="text-[#0080a3]">Sécurité, Souveraineté et Transparence</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Chez MaydAI, nous ne faisons aucun compromis avec la sécurité. Nous avons fait le choix stratégique 
              d&apos;une infrastructure souveraine et robuste pour garantir que vos données restent protégées, 
              confidentielles et sous juridiction européenne.
            </p>
          </div>
        </section>

        {/* Bande de logos "Nos Garanties" */}
        <section className="py-12 bg-gray-50 border-y border-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
              Nos Garanties de Sécurité
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 lg:gap-14">
              {certifications.map((cert, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center group transition-transform hover:scale-105"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 relative mb-2 grayscale hover:grayscale-0 transition-all duration-300">
                    <Image
                      src={cert.src}
                      alt={cert.alt}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{cert.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-8 max-w-2xl mx-auto">
              <em>MaydAI repose sur l&apos;infrastructure OVHcloud certifiée selon les normes internationales les plus strictes.</em>
            </p>
          </div>
        </section>

        {/* 3 Blocs principaux (Cards en colonnes) */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {securityBlocks.map((block, index) => {
                const IconComponent = block.icon;
                return (
                  <div 
                    key={index}
                    className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-[#0080a3]/10 rounded-xl">
                        <IconComponent className="w-8 h-8 text-[#0080a3]" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{block.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{block.description}</p>
                    <ul className="space-y-4">
                      {block.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="border-l-2 border-[#0080a3]/30 pl-4">
                          <h4 className="font-semibold text-gray-800 mb-1">{feature.title}</h4>
                          <p className="text-sm text-gray-600">{feature.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section FAQ */}
        <section className="py-16 md:py-24 px-4 bg-gray-50">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <Image 
                  src="/icons/chats.png" 
                  alt="FAQ" 
                  width={64} 
                  height={64} 
                  className="w-16 h-16"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#0080a3] mb-4">
                Questions fréquentes sur la sécurité
              </h2>
              <p className="text-gray-600">
                Tout ce que vous devez savoir sur la protection de vos données
              </p>
            </div>

            <div className="space-y-4">
              {faqData.map((item, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="pr-4">{item.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-[#0080a3] flex-shrink-0 transition-transform duration-300 ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openFaq === index ? 'max-h-96' : 'max-h-0'
                    }`}
                  >
                    <div className="p-5 pt-0 text-gray-600 leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="bg-gradient-to-br from-[#0080a3]/5 to-blue-50 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-white rounded-2xl shadow-md">
                  <Lock className="w-10 h-10 text-[#0080a3]" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Prêt à sécuriser votre conformité IA ?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Rejoignez les entreprises qui font confiance à MaydAI pour protéger leurs données 
                tout en assurant leur conformité à l&apos;AI Act européen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/signup"
                  className="bg-[#0080a3] text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#006d8a] transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 no-underline flex items-center gap-2"
                >
                  <Image src="/icons/space-rocket-launch.png" alt="Fusée" width={20} height={20} className="w-5 h-5" />
                  Commencer gratuitement
                </Link>
                <Link
                  href="/contact"
                  className="bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-300 shadow-md hover:shadow-lg no-underline flex items-center gap-2"
                >
                  <Image src="/icons/chats.png" alt="Chat" width={20} height={20} className="w-5 h-5" />
                  Demander une démo
                </Link>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Hébergé en France • Infrastructure certifiée • Conformité RGPD garantie
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

