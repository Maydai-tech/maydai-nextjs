'use client';

import { FiPhone, FiMail, FiMapPin, FiChevronDown } from 'react-icons/fi';
import Image from 'next/image';
import Script from 'next/script';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';
import { useState, useEffect, useRef } from 'react';

export default function ContactPage() {
  const [isHubspotLoaded, setIsHubspotLoaded] = useState(false);
  const [hubspotError, setHubspotError] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const hubspotContainerRef = useRef<HTMLDivElement>(null);
  const hubspotFormCreatedRef = useRef(false);

  // Récupération du nonce CSP
  const nonce = typeof window !== 'undefined' ? 
    document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || undefined : 
    undefined;

  // Fonction pour créer le formulaire Hubspot (une seule fois au chargement)
  const createHubspotForm = () => {
    if (hubspotFormCreatedRef.current) {
      return; // Éviter de créer le formulaire plusieurs fois
    }

    // Vérifier que hbspt est disponible
    if (typeof window === 'undefined' || !(window as any).hbspt) {
      return; // hbspt n'est pas encore disponible
    }

    // Vérifier que le conteneur existe dans le DOM
    const container = document.querySelector('#hubspot-form-container');
    if (!container) {
      return; // Le conteneur n'est pas encore dans le DOM
    }

    try {
      hubspotFormCreatedRef.current = true;
      
      (window as any).hbspt.forms.create({
        portalId: "146512527",
        formId: "a8ba2616-b912-4158-a0c5-cb84a56c954d",
        region: "eu1",
        target: '#hubspot-form-container',
        onFormReady: function() {
          setIsHubspotLoaded(true);
          
          // Vérifier que le formulaire est bien dans le bon conteneur
          const targetContainer = document.querySelector('#hubspot-form-container');
          const form = document.querySelector('.hs-form');
          
          if (form && targetContainer && !targetContainer.contains(form)) {
            // Si le formulaire n'est pas dans le bon conteneur, le déplacer
            console.warn('Formulaire HubSpot déplacé vers le bon conteneur');
            targetContainer.appendChild(form);
          }
        },
        onFormSubmitted: function() {
          console.log('Formulaire Hubspot soumis avec succès');
        },
      });
    } catch (error) {
      console.error('Erreur lors de la création du formulaire Hubspot:', error);
      hubspotFormCreatedRef.current = false;
      setHubspotError(true);
    }
  };

  // Effect pour créer le formulaire - se déclenche au montage et quand le script est chargé
  useEffect(() => {
    if (hubspotFormCreatedRef.current || hubspotError) {
      return;
    }

    let isMounted = true;
    let observer: MutationObserver | null = null;
    let retryCount = 0;
    const maxRetries = 30; // 30 tentatives max (6 secondes au total)
    
    // Fonction pour vérifier et créer le formulaire
    const checkAndCreate = () => {
      if (!isMounted || hubspotFormCreatedRef.current) {
        return;
      }

      // Vérifier que hbspt est disponible
      if (typeof window !== 'undefined' && (window as any).hbspt) {
        // Marquer le script comme chargé si ce n'est pas déjà fait
        if (!isScriptLoaded) {
          setIsScriptLoaded(true);
        }
        
        createHubspotForm();
        
        // Si le formulaire a été créé, configurer l'observer
        if (hubspotFormCreatedRef.current) {
          // Observer pour détecter si HubSpot injecte le formulaire ailleurs
          observer = new MutationObserver((mutations) => {
            const targetContainer = document.querySelector('#hubspot-form-container');
            const form = document.querySelector('.hs-form');
            
            if (form && targetContainer && !targetContainer.contains(form)) {
              // Le formulaire a été injecté ailleurs, le déplacer
              console.warn('Formulaire HubSpot détecté ailleurs, déplacement vers le conteneur cible');
              targetContainer.appendChild(form);
            }
          });
          
          // Observer les changements dans le body
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      } else if (retryCount < maxRetries) {
        // hbspt n'est pas encore disponible, réessayer
        retryCount++;
        setTimeout(checkAndCreate, 200);
      } else {
        // Trop de tentatives, afficher une erreur
        if (isMounted) {
          setHubspotError(true);
        }
      }
    };
    
    // Démarrer la vérification immédiatement
    checkAndCreate();

    const timeoutTimer = setTimeout(() => {
      if (isMounted && !hubspotFormCreatedRef.current) {
        setHubspotError(true);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
      }
      clearTimeout(timeoutTimer);
    };
  }, [isScriptLoaded, hubspotError]);

  // Effect supplémentaire qui se déclenche au montage pour vérifier si hbspt est déjà disponible
  useEffect(() => {
    // Vérifier immédiatement si hbspt est déjà disponible
    if (typeof window !== 'undefined' && (window as any).hbspt && !isScriptLoaded && !hubspotFormCreatedRef.current) {
      setIsScriptLoaded(true);
    }
  }, []);

  const faqData = [
    {
      question: "Comment réaliser un test gratuit d'audit IA Act avec MaydAI ?",
      answer: "Il suffit de créer un compte sur notre plateforme. Nous offrons l'accès au plan Freemium pour votre premier registre et vos deux premiers cas d'usage, vous permettant ainsi d'effectuer une première analyse de conformité sans frais et à votre rythme."
    },
    {
      question: "Le premier registre de conformité est-il vraiment gratuit ?",
      answer: "Oui. MaydAI s'engage à rendre la conformité accessible. Votre inscription inclut la création gratuite de votre premier registre IA et l'analyse de plusieurs systèmes d'IA selon les critères de l'IA Act européen."
    },
    {
      question: "Puis-je contacter l'équipe pour un accompagnement personnalisé ?",
      answer: "Absolument. Utilisez le formulaire ci-dessus ou contactez-nous directement par téléphone au 07 68 93 91 16 pour discuter de vos besoins spécifiques en gouvernance de l'IA."
    }
  ];

  return (
    <>
      <Header />
      
      {/* Scripts Hubspot avec nonce pour la sécurité */}
      <Script
        src="https://js-eu1.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        nonce={nonce}
        onLoad={() => {
          // Attendre un peu que hbspt soit disponible
          setTimeout(() => {
            setIsScriptLoaded(true);
          }, 100);
        }}
        onError={(error) => {
          console.error('Erreur de chargement du script Hubspot:', error);
          setHubspotError(true);
        }}
        onReady={() => {
          // Vérifier que hbspt est disponible
          if (typeof window !== 'undefined' && (window as any).hbspt) {
            setIsScriptLoaded(true);
          }
        }}
      />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        {/* Section principale */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            
            {/* Titre principal */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight text-center">
                <span className="text-[#0080a3]">Contactez MaydAI & Réalisez vos</span>
                <br />
                <span className="text-[#ffab5a]">Tests Gratuits Audit IA Act</span>
              </h1>

              {/* Paragraphe d'introduction */}
              <p className="text-lg text-gray-700 mb-8 leading-relaxed max-w-4xl mx-auto">
                Une question sur notre solution ou une demande de partenariat ? Notre équipe vous répond. 
                Vous souhaitez tester la conformité de vos systèmes ? Accédez immédiatement à notre offre découverte.
              </p>
            </div>

            {/* Formulaire de contact Hubspot */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-12 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
                {/* Colonne Image - Dashboard MaydAI */}
                <div className="relative hidden lg:block h-[600px] bg-gray-100 flex items-center justify-center p-4">
                  <div className="relative w-full h-[500px]">
                    <Image
                      src="/icons/Dashboard MaydAI.png"
                      alt="Dashboard MaydAI - Registre de conformité et Audit IA Act"
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>
                </div>

                {/* Colonne Formulaire Hubspot */}
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  {/* Conteneur pour le formulaire Hubspot */}
                  <div className="w-full">
                    {/* Message d'erreur */}
                    {hubspotError && (
                      <div className="space-y-6 mb-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800 text-sm">
                            <strong>Formulaire temporairement indisponible.</strong><br />
                            Vous pouvez nous contacter directement par email ou téléphone (voir les coordonnées ci-dessous).
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Conteneur HubSpot - doit être toujours présent dans le DOM */}
                    <div 
                      ref={hubspotContainerRef} 
                      id="hubspot-form-container" 
                      className="w-full"
                    ></div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    En nous contactant, vous acceptez notre{' '}
                    <a href="/politique-confidentialite" className="text-[#0080a3] hover:underline">
                      politique de confidentialité
                    </a>.
                  </p>

                  {/* Styles pour personnaliser le formulaire Hubspot */}
                  <style jsx>{`
                    #hubspot-form-container .hs-form {
                      font-family: inherit;
                    }
                    
                    #hubspot-form-container .hs-form .hs-fieldtype-text input,
                    #hubspot-form-container .hs-form .hs-fieldtype-email input,
                    #hubspot-form-container .hs-form .hs-fieldtype-phone input,
                    #hubspot-form-container .hs-form .hs-fieldtype-select select,
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
                    #hubspot-form-container .hs-form .hs-fieldtype-select select:focus,
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

            {/* Section Nous Contacter Directement */}
            <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 border border-gray-100 mb-12">
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
            </div>

            {/* Section FAQ */}
            <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 border border-gray-100">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 text-center">
                Questions Fréquentes
              </h2>

              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                      <FiChevronDown 
                        className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                          openFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaqIndex === index && (
                      <div className="px-6 py-4 bg-white text-gray-700">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schema.org FAQPage JSON-LD */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  "mainEntity": faqData.map((faq) => ({
                    "@type": "Question",
                    "name": faq.question,
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": faq.answer
                    }
                  }))
                })
              }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}