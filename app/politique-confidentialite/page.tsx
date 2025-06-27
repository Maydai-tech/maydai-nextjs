import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PolitiqueConfidentialitePage() {
  // Date actuelle pour la mise à jour
  const currentDate = new Date().toLocaleDateString('fr-FR');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto p-8 py-16">
          {/* Titre principal */}
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Politique de Confidentialité
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Très soucieux de la confidentialité et de la sécurité des informations personnelles 
              appartenant à nos utilisateurs, nous détaillons ci-dessous notre politique de confidentialité :
            </p>
          </header>

          {/* Contenu juridique */}
          <article className="prose prose-lg max-w-none">
            
            {/* Article 1 : Préambule */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 1 : Préambule
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                La présente politique de confidentialité a pour but d'informer les utilisateurs du site 
                <strong> MaydAI.io</strong> sur la manière dont sont collectées, traitées et protégées 
                les données à caractère personnel des utilisateurs, en conformité avec le Règlement 
                Général sur la Protection des Données (RGPD) et la loi Informatique et Libertés.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Cette politique s'applique à l'ensemble des services proposés par MaydAI et peut être 
                amenée à évoluer en fonction des modifications réglementaires ou des évolutions de nos services.
              </p>
            </section>

            {/* Article 2 : Principes Relatifs à la Collecte et au Traitement des Données Personnelles */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 2 : Principes Relatifs à la Collecte et au Traitement des Données Personnelles
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Conformément à l'article 5 du Règlement européen 2016/679, les données à caractère personnel sont :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Traitées de manière licite, loyale et transparente au regard de la personne concernée</li>
                <li>Collectées pour des finalités déterminées, explicites et légitimes</li>
                <li>Adéquates, pertinentes et limitées à ce qui est nécessaire au regard des finalités</li>
                <li>Exactes et, si nécessaire, tenues à jour</li>
                <li>Conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire</li>
                <li>Traitées de façon à garantir une sécurité appropriée des données à caractère personnel</li>
                <li>Ne sont pas transférées vers un pays tiers sans garanties appropriées</li>
                <li>L'utilisateur est informé en cas de rectification ou d'effacement de données</li>
              </ul>
            </section>

            {/* Article 3 : Données à Caractère Personnel Collectées */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 3 : Données à Caractère Personnel Collectées
              </h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  3.1 Données collectées
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Les données personnelles collectées sur MaydAI.io sont les suivantes :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone</li>
                  <li>Données de géolocalisation (avec consentement)</li>
                  <li>Données de navigation et d'utilisation du site</li>
                  <li>Informations relatives à votre entreprise et vos projets IA</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  3.2 Mode de collecte
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Les données personnelles sont collectées de deux manières :
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li><strong>Collecte automatique :</strong> lors de votre navigation sur le site (cookies, logs de connexion)</li>
                  <li><strong>Collecte via formulaires :</strong> lors de votre inscription, contact ou utilisation de nos services</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Durée de conservation :</strong> Les données sont conservées pendant une durée de 13 mois 
                  à compter de leur collecte, sauf obligation légale contraire.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  3.3 Hébergement des données
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    <strong>Hébergeur technique :</strong><br />
                    Vercel Inc.<br />
                    340 S Lemon Ave #4133<br />
                    Walnut, CA 91789, États-Unis
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Responsable du traitement :</strong><br />
                    MaydAI<br />
                    47 rue Erlanger<br />
                    75016 Paris, France<br />
                    Email : <a href="mailto:contact@maydai.io" className="text-[#0080a3] hover:underline">contact@maydai.io</a><br />
                    Téléphone : <a href="tel:+33768939116" className="text-[#0080a3] hover:underline">07 68 93 91 16</a>
                  </p>
                </div>
              </div>
            </section>

            {/* Article 4 : Responsable du Traitement des Données */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 4 : Responsable du Traitement des Données
              </h2>
              
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  4.1 Le responsable du traitement
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Les données à caractère personnel sont collectées par <strong>MaydAI</strong>, 
                    SAS immatriculée sous le numéro de SIREN <strong>942513185</strong>.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Contact :</strong><br />
                    Par courrier : MaydAI, 47 rue Erlanger, 75016 Paris<br />
                    Par email : <a href="mailto:contact@maydai.io" className="text-[#0080a3] hover:underline">contact@maydai.io</a><br />
                    Par téléphone : <a href="tel:+33768939116" className="text-[#0080a3] hover:underline">07 68 93 91 16</a>
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  4.2 Le délégué à la protection des données (DPO)
                </h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Nom :</strong> Thomas Chippeaux<br />
                    <strong>Adresse :</strong> MaydAI, 47 rue Erlanger, 75016 Paris<br />
                    <strong>Email :</strong> <a href="mailto:thomas.chippeaux@maydai.io" className="text-[#0080a3] hover:underline">thomas.chippeaux@maydai.io</a><br />
                    <strong>Téléphone :</strong> <a href="tel:+33768939116" className="text-[#0080a3] hover:underline">07 68 93 91 16</a>
                  </p>
                </div>
              </div>
            </section>

            {/* Article 5 : Les Droits de l'Utilisateur */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 5 : Les Droits de l'Utilisateur
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Tout utilisateur concerné par le traitement de ses données peut se prévaloir des droits suivants, 
                en application du Règlement Européen 2016/679 et de la Loi Informatique et Liberté (Loi 78-17 du 6 janvier 1978) :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li><strong>Droit d'accès :</strong> obtenir la confirmation que des données vous concernant sont traitées et accéder à ces données</li>
                <li><strong>Droit de rectification :</strong> obtenir la rectification des données inexactes vous concernant</li>
                <li><strong>Droit à l'effacement :</strong> obtenir l'effacement de vos données dans certains cas</li>
                <li><strong>Droit à la limitation :</strong> obtenir la limitation du traitement de vos données dans certains cas</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et les transmettre à un autre responsable</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données pour des motifs légitimes</li>
                <li><strong>Droit de retrait du consentement :</strong> retirer votre consentement à tout moment</li>
                <li><strong>Droit de définir des directives :</strong> définir des directives relatives au sort de vos données après votre décès</li>
              </ul>
              <div className="bg-[#0080a3]/5 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Pour exercer ces droits :</strong><br />
                  Contactez-nous par courrier à : <strong>MaydAI, 47 rue Erlanger, 75016 Paris</strong><br />
                  Ou par email à : <a href="mailto:contact@maydai.io" className="text-[#0080a3] hover:underline font-semibold">contact@maydai.io</a>
                </p>
                <p className="text-gray-700 leading-relaxed mt-3">
                  Vous disposez également du droit d'introduire une réclamation auprès de la CNIL 
                  (Commission Nationale de l'Informatique et des Libertés).
                </p>
              </div>
            </section>

            {/* Article 6 : Conditions de Modification */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Article 6 : Conditions de Modification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                L'éditeur du site MaydAI.io se réserve le droit de pouvoir modifier la présente Politique 
                à tout moment afin d'assurer aux utilisateurs du site sa conformité avec le droit en vigueur.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Les éventuelles modifications ne sauraient avoir d'incidence sur les achats antérieurement effectués 
                sur le site, lesquels restent soumis à la Politique en vigueur au moment de l'achat et telle 
                qu'acceptée par l'utilisateur lors de la validation de l'achat.
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 leading-relaxed">
                  <strong>Dates importantes :</strong><br />
                  La présente politique, éditée le <strong>26/03/2025</strong>, a été mise à jour le <strong>{currentDate}</strong>.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Contact
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Pour toute question concernant cette politique de confidentialité ou l'exercice de vos droits, 
                vous pouvez nous contacter :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0080a3]/5 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Par courrier</h3>
                  <p className="text-gray-700">
                    MaydAI<br />
                    47 rue Erlanger<br />
                    75016 Paris, France
                  </p>
                </div>
                <div className="bg-[#0080a3]/5 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Par voie électronique</h3>
                  <p className="text-gray-700">
                    Email : <a href="mailto:contact@maydai.io" className="text-[#0080a3] hover:underline">contact@maydai.io</a><br />
                    Téléphone : <a href="tel:+33768939116" className="text-[#0080a3] hover:underline">07 68 93 91 16</a>
                  </p>
                </div>
              </div>
            </section>

          </article>
        </div>
      </main>
      <Footer />
    </>
  );
} 