'use client';

import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import Image from 'next/image';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [isHubspotLoaded, setIsHubspotLoaded] = useState(false);
  const [hubspotError, setHubspotError] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Debug helper function
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
    console.log(`HubSpot Debug: ${info}`);
  };

  // Fonction pour créer le formulaire Hubspot avec retry logic
  const createHubspotForm = () => {
    addDebugInfo('Tentative de création du formulaire HubSpot');
    
    if (typeof window !== 'undefined' && (window as any).hbspt) {
      try {
        addDebugInfo('Object hbspt trouvé, création du formulaire');
        (window as any).hbspt.forms.create({
          portalId: "146512527",
          formId: "a8ba2616-b912-4158-a0c5-cb84a56c954d",
          region: "eu1",
          target: '#hubspot-form-container',
          onFormReady: function() {
            addDebugInfo('Formulaire HubSpot prêt');
            setIsHubspotLoaded(true);
          },
          onFormSubmitted: function() {
            addDebugInfo('Formulaire HubSpot soumis avec succès');
            console.log('Formulaire Hubspot soumis avec succès');
          },
          onFormFailedValidation: function() {
            addDebugInfo('Erreur de validation du formulaire HubSpot');
            console.log('Erreur de validation du formulaire Hubspot');
          },
          onFormSubmitError: function() {
            addDebugInfo('Erreur de soumission du formulaire HubSpot');
            console.error('Erreur de soumission du formulaire Hubspot');
          }
        });
        setIsHubspotLoaded(true);
      } catch (error) {
        addDebugInfo(`Erreur lors de la création du formulaire: ${error}`);
        console.error('Erreur lors de la création du formulaire Hubspot:', error);
        setHubspotError(true);
      }
    } else {
      addDebugInfo('Object hbspt non trouvé');
      if (isScriptLoaded) {
        // Si le script est chargé mais hbspt n'est pas disponible, c'est une erreur
        addDebugInfo('Script chargé mais hbspt non disponible - erreur');
        setHubspotError(true);
      }
    }
  };

  // Effect pour retry la création du formulaire
  useEffect(() => {
    if (isScriptLoaded && !isHubspotLoaded && !hubspotError) {
      // Retry avec un délai pour laisser le temps au script de s'initialiser
      const retryTimer = setTimeout(() => {
        createHubspotForm();
      }, 500);

      // Timeout final après 10 secondes
      const timeoutTimer = setTimeout(() => {
        if (!isHubspotLoaded) {
          addDebugInfo('Timeout - formulaire non chargé après 10s');
          setHubspotError(true);
        }
      }, 10000);

      return () => {
        clearTimeout(retryTimer);
        clearTimeout(timeoutTimer);
      };
    }
  }, [isScriptLoaded, isHubspotLoaded, hubspotError]);

  return (
    <>
      <Header />
      
      {/* Scripts Hubspot avec nonce pour la sécurité */}
      <Script
        src="https://js-eu1.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        onLoad={() => {
          addDebugInfo('Script HubSpot chargé');
          setIsScriptLoaded(true);
          // Attendre un peu que le script s'initialise avant de créer le formulaire
          setTimeout(() => {
            createHubspotForm();
          }, 100);
        }}
        onError={(error) => {
          addDebugInfo(`Erreur de chargement du script: ${error}`);
          console.error('Erreur de chargement du script Hubspot:', error);
          setHubspotError(true);
        }}
        onReady={() => {
          addDebugInfo('Script HubSpot prêt');
        }}
      />

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

            {/* Formulaire de contact Hubspot */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-12 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
                {/* Colonne Image - Alice Recoque */}
                <div className="relative hidden lg:block">
                  <Image
                    src="/content/alice-recoque.webp"
                    alt="Alice Recoque - Experte en IA et conformité"
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  {/* Overlay avec informations en bas */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-8 px-6">
                    <div className="text-center text-white">
                      <p className="text-lg font-medium mb-3">
                        Alice Recoque
                      </p>
                      <a 
                        href="https://fr.wikipedia.org/wiki/Alice_Recoque" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-200 text-sm underline transition-colors duration-200 inline-block mb-2"
                      >
                        En savoir plus sur Wikipedia
                      </a>
                      <p className="text-xs text-gray-300 mt-2">
                        Image générée par ChatGPT-4o
                      </p>
                    </div>
                  </div>
                </div>

                {/* Colonne Formulaire Hubspot */}
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  {/* Conteneur pour le formulaire Hubspot */}
                  <div id="hubspot-form-container" className="w-full">
                    {/* Message de chargement */}
                    {!isHubspotLoaded && !hubspotError && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-[#0080a3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Chargement du formulaire...</p>
                        {/* Debug info en développement */}
                        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
                          <div className="mt-4 text-xs text-gray-400 text-left">
                            <p className="font-semibold mb-2">Debug:</p>
                            {debugInfo.map((info, index) => (
                              <p key={index}>{info}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message d'erreur avec formulaire de fallback */}
                    {hubspotError && (
                      <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                          <p className="text-yellow-800 text-sm">
                            <strong>Formulaire temporairement indisponible.</strong><br />
                            Vous pouvez nous contacter directement par email ou téléphone (voir les coordonnées ci-dessous).
                          </p>
                          {/* Debug info en développement */}
                          {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
                            <div className="mt-4 text-xs text-gray-600">
                              <p className="font-semibold mb-2">Informations de debug:</p>
                              {debugInfo.map((info, index) => (
                                <p key={index}>{info}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Formulaire de contact simple de fallback */}
                        <form 
                          action="mailto:contact@maydai.io" 
                          method="get" 
                          className="space-y-4"
                        >
                          <div>
                            <label htmlFor="fallback-subject" className="block text-sm font-medium text-gray-700 mb-2">
                              Objet
                            </label>
                            <input
                              type="text"
                              id="fallback-subject"
                              name="subject"
                              defaultValue="Demande de rejoindre la communauté bêta-testeurs MaydAI"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200"
                              readOnly
                            />
                          </div>
                          
                          <div>
                            <label htmlFor="fallback-body" className="block text-sm font-medium text-gray-700 mb-2">
                              Message
                            </label>
                            <textarea
                              id="fallback-body"
                              name="body"
                              rows={6}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#0080a3] focus:border-[#0080a3] transition-colors duration-200 resize-vertical"
                              placeholder="Bonjour,&#10;&#10;Je souhaite rejoindre la communauté des bêta-testeurs MaydAI.&#10;&#10;Nom et Prénom : &#10;Téléphone : &#10;Motivations : &#10;&#10;Cordialement,"
                            />
                          </div>
                          
                          <button
                            type="submit"
                            className="w-full font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0080a3] focus:ring-offset-2 bg-[#0080a3] hover:bg-[#006b8a] text-white transform hover:scale-105"
                          >
                            Ouvrir votre client email
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Styles pour personnaliser le formulaire Hubspot */}
                  <style jsx>{`
                    #hubspot-form-container .hs-form {
                      font-family: inherit;
                    }
                    
                    #hubspot-form-container .hs-form .hs-fieldtype-text input,
                    #hubspot-form-container .hs-form .hs-fieldtype-email input,
                    #hubspot-form-container .hs-form .hs-fieldtype-phone input,
                    #hubspot-form-container .hs-form .hs-fieldtype-textarea textarea {
                      width: 100% !important;
                      padding: 12px 16px !important;
                      border: 1px solid #d1d5db !important;
                      border-radius: 8px !important;
                      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
                      font-size: 16px !important;
                      transition: all 0.2s !important;
                    }
                    
                    #hubspot-form-container .hs-form .hs-fieldtype-text input:focus,
                    #hubspot-form-container .hs-form .hs-fieldtype-email input:focus,
                    #hubspot-form-container .hs-form .hs-fieldtype-phone input:focus,
                    #hubspot-form-container .hs-form .hs-fieldtype-textarea textarea:focus {
                      outline: none !important;
                      ring: 2px !important;
                      ring-color: #0080a3 !important;
                      border-color: #0080a3 !important;
                    }
                    
                    #hubspot-form-container .hs-form .hs-submit input {
                      width: 100% !important;
                      background-color: #0080a3 !important;
                      color: white !important;
                      font-weight: 600 !important;
                      padding: 16px 24px !important;
                      border-radius: 8px !important;
                      border: none !important;
                      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                      transition: all 0.3s !important;
                      cursor: pointer !important;
                      font-size: 16px !important;
                    }
                    
                    #hubspot-form-container .hs-form .hs-submit input:hover {
                      background-color: #006b8a !important;
                      transform: scale(1.02) !important;
                    }
                    
                    #hubspot-form-container .hs-form label {
                      font-weight: 500 !important;
                      color: #374151 !important;
                      margin-bottom: 8px !important;
                      display: block !important;
                      font-size: 14px !important;
                    }
                    
                    #hubspot-form-container .hs-form .hs-form-field {
                      margin-bottom: 24px !important;
                    }
                    
                    #hubspot-form-container .hs-form .hs-error-msgs {
                      color: #dc2626 !important;
                      font-size: 14px !important;
                      margin-top: 4px !important;
                    }
                  `}</style>
                </div>
              </div>
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
                      <span className="text-sm text-gray-600">Expertise partagée sur l&apos;IA Act et la conformité</span>
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