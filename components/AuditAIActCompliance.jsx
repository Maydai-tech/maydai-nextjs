import Image from 'next/image';

export default function AuditAIActCompliance() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-white" id="audit-ai-act">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-dark mb-8">Audit AI Act : Conformité et Sécurité pour vos Systèmes d&apos;IA</h2>
        <p className="text-lg mb-8 leading-relaxed text-gray-800">
          L'Intelligence Artificielle... Cette nouvelle accélération digitale qui, tel un génie sorti de sa lampe, nous demande soudain ce que nous désirons. Et notre premier vœu ? Un règlement. Un manuel. Un Audit. Voilà qui en dit long sur notre incurable et touchante manie de vouloir mettre de l'ordre dans le chaos que nous créons nous-mêmes.
        </p>
        
        {/* Image screen-mobile-ai-act après le texte d'introduction */}
        <div className="mb-8 flex justify-center">
          <Image 
            src="/illustration/screen-mobile-ai-act.webp" 
            alt="Écran mobile illustrant l'audit AI Act et la conformité des systèmes d'intelligence artificielle"
            width={400}
            height={300}
            className="rounded-lg shadow-md max-w-full h-auto"
          />
        </div>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-2xl font-semibold text-primary mb-4">Pourquoi un Audit AI Act est-il crucial ?</h3>
            <p className="leading-relaxed text-gray-800">
              Parce que la confiance, même envers une machine, ne se décrète pas ; elle se mérite. C'est un dialogue, une poignée de main, une vérification que le sourire de votre algorithme n'est pas celui du loup. Anticiper les risques, c'est bien. Éviter de finir dévoré par sa propre ambition, c'est encore mieux. L'audit, c'est ce regard lucide et un peu amusé que le créateur porte sur sa créature, avant de la lâcher dans le monde.
            </p>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-primary mb-4">Notre approche de l'Audit AI Act : L'horloger, pas l&apos;inquisiteur</h3>
            <p className="mb-4 leading-relaxed text-gray-800">
              Chez MaydAI, nous abordons l'AI Act sans blouse blanche ni ton doctoral.
            </p>
            <ul className="space-y-3 text-gray-800">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Nous diagnostiquons avec la curiosité d&apos;un naturaliste découvrant une nouvelle espèce.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Nous analysons les risques comme un vieux marin scrute le ciel, sachant que le calme plat peut cacher la tempête.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Nous vous guidons avec des recommandations qui ont le goût du bon sens, pas celui du jargon abscons.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span>Nous assurons un suivi qui ressemble plus à une conversation entre gens de bonne compagnie qu&apos;à un interrogatoire.</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-2xl font-semibold text-primary mb-4">Les bénéfices, au-delà des mots ronflants :</h3>
            <ul className="space-y-3 text-gray-800">
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span><strong>La sérénité réglementaire :</strong> Naviguez dans les eaux de l&apos;AI Act sans craindre le naufrage.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span><strong>Une éthique qui devient un atout :</strong> Montrez que votre modernité a une âme.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span><strong>La fin des angles morts :</strong> Éclairez les recoins de vos systèmes où se cachent les ennuis de demain.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary font-bold mr-2">•</span>
                <span><strong>Un partenariat, pas une simple prestation :</strong> Nous sommes là pour que l'aventure de l&apos;IA reste une belle histoire.</span>
              </li>
            </ul>
            
            {/* Image dice-ai-act après le texte sur le partenariat */}
            <div className="mt-8 flex justify-center">
              <Image 
                src="/illustration/dice-ai-act.webp" 
                alt="Illustration symbolique de l'audit AI Act et de la conformité IA"
                width={350}
                height={250}
                className="rounded-lg shadow-md max-w-full h-auto"
              />
            </div>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-6 mt-8">
            <p className="text-lg font-medium text-primary-dark leading-relaxed italic">
              Avec MaydAI, optimisez vos systèmes d'IA pour les rendre plus conformes, responsables et performants grâce à la maîtrise humaine. Nous vous accompagnons pour transformer vos outils en un instrument de précision dont vous gardez le contrôle absolu, garantissant une interaction fiable et une gouvernance transparente pour votre organisation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 