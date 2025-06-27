'use client';

import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      motivations: formData.get('motivations') as string,
    };

    try {
      const response = await fetch('/api/beta-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage({
          type: 'success',
          text: 'Merci ! Votre demande a été envoyée avec succès. Nous vous recontacterons bientôt.',
        });
        // Reset the form
        e.currentTarget.reset();
      } else {
        setSubmitMessage({
          type: 'error',
          text: result.error || 'Une erreur est survenue lors de l\'envoi de votre demande.',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du formulaire:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Une erreur inattendue est survenue. Veuillez réessayer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        {/* Section principale */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            
            {/* Titre principal */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Rejoignez la Communauté des{' '}
                <span className="text-[#0080a3]">Bêta-Testeurs MaydAI</span>
              </h1>

              {/* Paragraphe d'introduction */}
              <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-4xl mx-auto">
                La plateforme MaydAI est actuellement accessible à une communauté de Beta testeurs 
                (avocats, chercheurs, experts IA, Friends and Family..). Si vous souhaitez rejoindre 
                cette communauté, nous serions ravis de vous y accueillir pour améliorer notre plateforme, 
                les interactions proposées et les analyses poussées sur de multiples cas d'usages IA, 
                y compris ceux liés aux nouvelles régulations comme l'IA Act.
              </p>
            </div>



            {/* Sous-titre */}
            <p className="text-xl font-semibold text-gray-900 mb-8 text-center">
              Envoyez-nous ce formulaire, nous serons heureux de vous inviter et de vous compter parmi nous :
            </p>

            {/* Formulaire de contact */}
            <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 border border-gray-100 mb-12">
              {/* Message de statut */}
              {submitMessage && (
                <div className={`mb-6 p-4 rounded-lg ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {submitMessage.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Champ Nom Prénom */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom Prénom *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200"
                    placeholder="Votre nom et prénom"
                  />
                </div>

                {/* Champ Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200"
                    placeholder="votre.email@exemple.com"
                  />
                </div>

                {/* Champ Téléphone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                {/* Champ Motivations */}
                <div>
                  <label htmlFor="motivations" className="block text-sm font-medium text-gray-700 mb-2">
                    Vos motivations pour nous rejoindre *
                  </label>
                  <textarea
                    id="motivations"
                    name="motivations"
                    rows={5}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200 resize-vertical"
                    placeholder="Expliquez-nous pourquoi vous souhaitez rejoindre notre communauté de bêta-testeurs..."
                  />
                </div>

                {/* Bouton d'envoi */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0080a3] focus:ring-offset-2 ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#0080a3] hover:bg-[#006b8a] text-white transform hover:scale-105'
                  }`}
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                </button>
              </form>
            </div>

            {/* Section Nous Contacter Directement - Déplacée en bas */}
            <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 border border-gray-100">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 text-center">
                Nous Contacter Directement
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Bloc Téléphone */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-4">
                    <div className="w-16 h-16 bg-[#0080a3]/10 rounded-lg flex items-center justify-center">
                      <FiPhone className="w-8 h-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Téléphone
                    </h3>
                    <a 
                      href="tel:+33768939116" 
                      className="text-gray-600 hover:text-[#0080a3] transition-colors duration-200"
                    >
                      07 68 93 91 16
                    </a>
                  </div>
                </div>

                {/* Bloc Email */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-4">
                    <div className="w-16 h-16 bg-[#0080a3]/10 rounded-lg flex items-center justify-center">
                      <FiMail className="w-8 h-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Email Contact
                    </h3>
                    <a 
                      href="mailto:contact@maydai.io" 
                      className="text-gray-600 hover:text-[#0080a3] transition-colors duration-200"
                    >
                      contact@maydai.io
                    </a>
                  </div>
                </div>

                {/* Bloc Adresse */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex-shrink-0 mb-4">
                    <div className="w-16 h-16 bg-[#0080a3]/10 rounded-lg flex items-center justify-center">
                      <FiMapPin className="w-8 h-8 text-[#0080a3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Adresse
                    </h3>
                    <address className="text-gray-600 not-italic leading-relaxed">
                      MaydAI<br />
                      47 rue Erlanger<br />
                      75016 Paris
                    </address>
                  </div>
                </div>
              </div>

              {/* Section supplémentaire avec informations sur la communauté */}
              <div className="mt-10 pt-8 border-t border-gray-200">
                <div className="bg-[#0080a3]/5 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    Pourquoi rejoindre notre communauté ?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-[#0080a3] rounded-full mr-3"></span>
                      <span className="text-sm text-gray-600">Accès prioritaire aux nouvelles fonctionnalités</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-[#0080a3] rounded-full mr-3"></span>
                      <span className="text-sm text-gray-600">Influence directe sur le développement produit</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-[#0080a3] rounded-full mr-3"></span>
                      <span className="text-sm text-gray-600">Expertise partagée sur l'IA Act et la conformité</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-[#0080a3] rounded-full mr-3"></span>
                      <span className="text-sm text-gray-600">Réseau de professionnels experts en IA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
} 