import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ConditionsGeneralesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8 py-16">
          {/* Titre principal */}
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-lg font-bold text-gray-800 leading-relaxed max-w-3xl mx-auto bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              VEUILLEZ LIRE ATTENTIVEMENT CES CONDITIONS GÉNÉRALES D'UTILISATION AVANT D'INTERAGIR AVEC NOTRE SITE WEB.
            </p>
          </header>

          {/* Contenu juridique */}
          <article className="prose prose-lg max-w-none">
            
            {/* Article 1 : Acceptation Des Conditions D'Utilisation */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                1. Acceptation Des Conditions D'Utilisation
              </h2>
              <p className="text-gray-700 leading-relaxed">
                En accédant au site web <strong>MaydAI.io</strong>, vous acceptez implicitement et intégralement 
                les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas 
                utiliser ce site.
              </p>
            </section>

            {/* Article 2 : Propriété Intellectuelle */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                2. Propriété Intellectuelle
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Tout le contenu présent sur <strong>MaydAI.io</strong>, y compris mais sans s'y limiter, 
                les textes, graphiques, logos, images, clips audio et vidéo, est la propriété exclusive 
                de MaydAI ou de ses partenaires, et est protégé par les lois sur la propriété intellectuelle. 
                Aucun élément de ce site ne peut être reproduit, distribué, modifié ou utilisé sans 
                autorisation écrite préalable.
              </p>
            </section>

            {/* Article 3 : Utilisation Du Site */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                3. Utilisation Du Site
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Vous vous engagez à utiliser <strong>MaydAI.io</strong> uniquement à des fins légales et 
                conformément aux présentes conditions d'utilisation. Vous acceptez de ne pas perturber 
                le fonctionnement normal du site ni d'accéder à des données qui ne vous sont pas destinées.
              </p>
            </section>

            {/* Article 4 : Informations Personnelles */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                4. Informations Personnelles
              </h2>
              <p className="text-gray-700 leading-relaxed">
                En utilisant <strong>MaydAI.io</strong>, vous consentez à la collecte et au traitement 
                de vos informations personnelles conformément à notre{' '}
                <a href="/politique-confidentialite" className="text-[#0080a3] hover:underline font-semibold">
                  politique de confidentialité
                </a>. Nous nous engageons à protéger vos données et à les utiliser uniquement dans le cadre prévu.
              </p>
            </section>

            {/* Article 5 : Liens Externes */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                5. Liens Externes
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Ce site peut contenir des liens vers des sites tiers. <strong>MaydAI</strong> n'a aucun 
                contrôle sur ces sites et n'assume aucune responsabilité quant à leur contenu ou leur 
                politique de confidentialité. L'inclusion de ces liens ne constitue pas une approbation de leur part.
              </p>
            </section>

            {/* Article 6 : Limitation De Responsabilité */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                6. Limitation De Responsabilité
              </h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>MaydAI</strong> ne peut garantir l'exactitude, l'exhaustivité ou la pertinence 
                des informations présentes sur <strong>MaydAI.io</strong>. En aucun cas, MaydAI ne pourra 
                être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de 
                l'impossibilité d'utiliser ce site.
              </p>
            </section>

            {/* Article 7 : Modification Des Conditions */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                7. Modification Des Conditions
              </h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>MaydAI</strong> se réserve le droit de modifier à tout moment les présentes 
                conditions d'utilisation. Les modifications prendront effet dès leur publication sur le site. 
                Il vous incombe de consulter régulièrement cette page pour prendre connaissance des 
                éventuelles mises à jour.
              </p>
            </section>

            {/* Article 8 : Loi Applicable Et Juridiction */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                8. Loi Applicable Et Juridiction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Les présentes conditions d'utilisation sont régies par les lois en vigueur en France. 
                Tout litige découlant de l'utilisation de ce site sera soumis à la compétence exclusive 
                des tribunaux compétents de <strong>Paris</strong>.
              </p>
            </section>

            {/* Article 9 : Contact */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                9. Contact
              </h2>
              <div className="bg-[#0080a3]/5 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  Pour toute question ou réclamation concernant les conditions d'utilisation de{' '}
                  <strong>MaydAI.io</strong>, veuillez nous contacter à{' '}
                  <a href="mailto:contact@maydai.io" className="text-[#0080a3] hover:underline font-semibold">
                    contact@maydai.io
                  </a>.
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-gray-600 text-sm">
                    <strong>Adresse :</strong> MaydAI, 47 rue Erlanger, 75016 Paris, France<br />
                    <strong>Téléphone :</strong>{' '}
                    <a href="tel:+33768939116" className="text-[#0080a3] hover:underline">
                      07 68 93 91 16
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Paragraphe de conclusion */}
            <section className="border-t border-gray-200 pt-8">
              <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
                <p className="text-lg font-bold leading-relaxed">
                  EN UTILISANT CE SITE, VOUS RECONNAISSEZ AVOIR LU, COMPRIS ET ACCEPTÉ 
                  LES PRÉSENTES CONDITIONS D'UTILISATION.
                </p>
              </div>
            </section>

            {/* Informations de mise à jour */}
            <section className="mt-8 text-center">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm">
                  <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}<br />
                  <strong>Version :</strong> 1.0
                </p>
              </div>
            </section>

          </article>
        </div>
      </main>
      <Footer />
    </>
  );
} 