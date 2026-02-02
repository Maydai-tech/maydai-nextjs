import Image from 'next/image';

export default function MistralDashboard() {
  const evaluationData = [
    {
      icon: '/icons/succes.png',
      title: 'Contrôle Humain et Supervision',
      subtitle: '(évaluation au cas par cas lors de l\'audit)',
      score: 0,
      total: 100
    },
    {
      icon: '/icons/Padlock.png',
      title: 'Robustesse Technique et Sécurité',
      score: 51,
      total: 100
    },
    {
      icon: '/icons/closed-eyes-1.png',
      title: 'Confidentialité et Gouvernance des Données',
      score: 99,
      total: 100
    },
    {
      icon: '/icons/Transpararency.png',
      title: 'Transparence',
      score: 74,
      total: 100
    },
    {
      icon: '/icons/balance-1.png',
      title: 'Diversité, Non-discrimination et Équité',
      subtitle: '(complété lors de l\'audit du cas d\'usage)',
      score: 37,
      total: 100
    },
    {
      icon: '/icons/feuille.png',
      title: 'Bien-être Social et Environnemental',
      score: 93,
      total: 100
    }
  ];

  const aggregateScore = 71;

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#0080a3' }}>
            Évaluation des LLM pour l'IA Act
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto italic text-center">
            Exemple avec le modèle de langage large (LLM) mistral-7B-v0.3
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Colonne 1: Score et Informations du modèle */}
            <div className="space-y-6">
              {/* Score agrégé avec heptagone */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Cercle élégant */}
                  <svg width="180" height="180" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="75"
                      fill="none"
                      stroke="#0080a3"
                      strokeWidth="6"
                      className="drop-shadow-lg"
                    />
                  </svg>
                  {/* Score au centre */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex items-baseline text-[#0080a3] font-bold mb-2">
                      <span className="text-5xl">{aggregateScore}</span>
                      <span className="text-2xl ml-1"> / 100</span>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      Score Agrégé
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Informations du Modèle</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Modèle Info</span>
                    <a 
                      href="https://huggingface.co/mistralai/Mistral-7B-v0.3" 
                      className="text-[#0080a3] hover:underline text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      huggingface.co/mistralai/Mistral-7B-v0.3
                    </a>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Paramètres</span>
                    <span className="text-gray-900 font-semibold">7,25B</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Créateur</span>
                    <span className="text-gray-900 font-semibold">Mistral AI</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Type</span>
                    <span className="text-gray-900 font-semibold">local</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Version</span>
                    <span className="text-gray-900 font-semibold">mistralai/Mistral-7B-v0.3</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Publié</span>
                    <span className="text-gray-900 font-semibold">Mai 2024</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 2: Principes éthiques de l'IA Act UE */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Principes Éthiques IA Act UE</h3>
              
              <div className="space-y-4">
                {evaluationData.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Image 
                            src={item.icon} 
                            alt={item.title} 
                            width={24} 
                            height={24} 
                            className="w-6 h-6"
                          />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-base font-semibold text-gray-800">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-sm text-gray-500 italic mt-1">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#0080a3]">
                            {item.score}
                          </div>
                          <div className="text-sm text-gray-500">
                            / {item.total}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
