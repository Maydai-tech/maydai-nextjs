import React from 'react';
import Image from 'next/image';

const EvaluationCriteriaSection: React.FC = () => {
  const criteria = [
    {
      icon: <Image src="/icons/Transpararency.png" alt="Transparence" width={40} height={40} className="w-10 h-10" />,
      title: "Clarté & Transparence",
      description: "Une IA ne doit jamais avancer masquée. Nous exigeons une transparence totale pour que l'homme sache toujours à qui, ou à quoi, il a affaire. Des capacités et limites clairement documentées aux contenus synthétiques dûment identifiés, c'est une question de respect, la première politesse des intelligences, qu'elles soient de chair ou de silicium."
    },
    {
      icon: <Image src="/icons/succes.png" alt="Succès" width={40} height={40} className="w-10 h-10" />,
      title: "Le Garde-fou Humain",
      description: "Le plus brillant des automates ne remplacera jamais la lueur d'une conscience. Chaque système doit rester sous le contrôle effectif d'un humain, capable d'intervenir, de corriger, et de dire « halte » pour prévenir ou minimiser les risques. La machine propose, mais c'est toujours l'homme qui, en dernier ressort, doit disposer."
    },
    {
      icon: <Image src="/icons/balance-1.png" alt="Balance" width={40} height={40} className="w-10 h-10" />,
      title: "Justice & Équité",
      description: "L'intelligence artificielle ne doit pas hériter de nos vieux démons. Nous scrutons les données qui l'ont nourrie pour traquer et corriger les biais potentiels, afin qu'elle ne devienne pas le miroir de nos propres injustices. Chaque algorithme doit être une promesse d'équité, et non la perpétuation de nos discriminations passées."
    },
    {
      icon: <Image src="/icons/Padlock.png" alt="Cadenas" width={40} height={40} className="w-10 h-10" />,
      title: "Robustesse & Fiabilité",
      description: "La confiance se mérite. Nous éprouvons la solidité des systèmes face aux erreurs, aux pannes et aux tentatives de corruption. Une IA digne de ce nom doit être résiliente, prévisible et sécurisée. C'est un allié fiable dans un monde qui, lui, ne l'est pas toujours."
    },
    {
      icon: <Image src="/icons/closed-eyes-1.png" alt="Yeux fermés" width={40} height={40} className="w-10 h-10" />,
      title: "Respect de l'Intimité",
      description: "Les données sont le reflet de vies humaines, pas une carrière à ciel ouvert. Nous veillons au respect scrupuleux de la vie privée et à une gouvernance des données irréprochable, en accord avec les principes de minimisation et de protection dès la conception. La plus grande intelligence est celle qui sait où s'arrêter : au seuil de l'intimité."
    },
    {
      icon: <Image src="/icons/feuille.png" alt="Feuille" width={40} height={40} className="w-10 h-10" />,
      title: "Responsabilité & Conscience",
      description: "Au-delà de sa performance, nous interrogeons l'empreinte d'une IA. Quelle est sa trace sur la société, sur l'environnement, sur nos démocraties ? Un système d'IA n'est pas qu'un outil, c'est un acteur dont il faut mesurer l'impact et la responsabilité à long terme. Un peu de conscience, même artificielle, ne peut assurément pas faire de mal."
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold sm:text-4xl mb-4" style={{ color: '#0080a3' }}>
            Nos Critères d'Évaluation : Une boussole pour l'IA de confiance
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Auditer une intelligence artificielle, c'est scruter son âme numérique avec la rigueur d'un enquêteur 
            et la bienveillance d'un sage. Nos six critères forment une boussole éthique pour naviguer dans 
            l'archipel complexe de l'IA responsable.
          </p>
        </div>

        {/* Grid of Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {criteria.map((criterion, index) => (
            <article 
              key={index}
              className="p-6 bg-white rounded-lg border border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
                             <div className="flex flex-col items-center space-y-4 text-center">
                 {/* Icon */}
                 <div className="flex-shrink-0">
                   {criterion.icon}
                 </div>
                 
                 {/* Title */}
                 <h3 className="text-xl font-semibold text-gray-900">
                   {criterion.title}
                 </h3>
                 
                 {/* Description */}
                 <p className="text-gray-600 leading-relaxed">
                   {criterion.description}
                 </p>
               </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EvaluationCriteriaSection; 